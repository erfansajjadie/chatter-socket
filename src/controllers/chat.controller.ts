import BaseController from "./base.controller";
import {
  Body,
  Get,
  JsonController,
  Param,
  Post,
  UploadedFile,
  QueryParam,
  Put,
  Delete,
} from "routing-controllers";
import { ConversationDto } from "../entities/conversation.dto";
import { ConversationType, MessageType, ParticipantRole } from "@prisma/client";
import { prisma } from "../helpers/prisma";
import {
  conversationMapper,
  mapper,
  messageMapper,
  userMapper,
} from "../helpers/mappers";
import { saveFile } from "../helpers/storage";

@JsonController()
export class ChatController extends BaseController {
  @Post("/create/conversation")
  async createConversation(
    @Body() dto: ConversationDto,
    @UploadedFile("file") file: any,
  ) {
    const { type, participants, name, description, isPublic } = dto;

    let image = null;
    if (file) {
      image = saveFile(image, "conversation_images");
    }

    dto.userId = parseInt(dto.userId as any);

    if (type == ConversationType.PRIVATE) {
      const previousConversation = await prisma.conversation.findFirst({
        where: {
          participants: {
            some: {
              userId: dto.userId,
            },
          },
          AND: {
            participants: {
              some: {
                userId: participants[0],
              },
            },
          },
        },
        include: {
          _count: {
            select: {
              messages: {
                where: { userId: { not: dto.userId }, isSeen: false },
              },
            },
          },
          participants: { take: 2, include: { user: true } },
          messages: {
            orderBy: { id: "desc" },
            take: 1,
            include: { user: true },
          },
        },
      });
      if (previousConversation) {
        return super.ok({
          conversation: conversationMapper(previousConversation, dto.userId),
        });
      }
    }

    // Create a new conversation
    const conversation = await prisma.conversation.create({
      include: {
        _count: {
          select: {
            messages: {
              where: { userId: { not: dto.userId }, isSeen: false },
            },
            ...(type === ConversationType.CHANNEL
              ? { participants: true }
              : {}),
          },
        },
        participants: {
          take: type === ConversationType.CHANNEL ? 5 : 2,
          include: { user: true },
        },
        messages: {
          orderBy: { id: "desc" },
          take: 1,
          include: { user: true },
        },
      },
      data: {
        type,
        image,
        name,
        description: description || null,
        isPublic: type === ConversationType.CHANNEL ? isPublic || false : null,
      },
    });

    // Create participants for the conversation
    if (type === ConversationType.CHANNEL) {
      // For channels, add creator as owner
      await prisma.participant.create({
        data: {
          userId: dto.userId,
          conversationId: conversation.id,
          role: "OWNER",
        },
      });

      // Create welcome message for channel
      await prisma.message.create({
        data: {
          text: `Channel "${name}" has been created`,
          type: MessageType.INFO,
          userId: dto.userId,
          conversationId: conversation.id,
        },
      });
    } else {
      // For regular conversations and groups
      await prisma.participant.createMany({
        data: [
          {
            userId: dto.userId,
            conversationId: conversation.id,
            role: type === ConversationType.GROUP ? "OWNER" : "MEMBER",
          },
          ...participants.map((p) => {
            return {
              userId: p,
              conversationId: conversation.id,
              role: ParticipantRole.MEMBER,
            };
          }),
        ],
      });
    }

    return super.ok({
      conversation: conversationMapper(conversation, dto.userId),
    });
  }

  @Get("/conversations/:userId")
  async getConversation(@Param("userId") userId: number) {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      orderBy: { lastMessageDate: "desc" },
      include: {
        _count: {
          select: {
            messages: { where: { userId: { not: userId }, isSeen: false } },
            participants: true,
          },
        },
        participants: {
          take: 5, // Increased to handle channels with more participants
          include: { user: true },
        },
        messages: { orderBy: { id: "desc" }, take: 1, include: { user: true } },
      },
    });

    // Filter conversations based on type
    const data = conversations.filter((c) => {
      if (
        c.type === ConversationType.CHANNEL ||
        c.type === ConversationType.GROUP
      ) {
        return true;
      }
      // For private conversations, only include them if they have messages
      return c.messages.length > 0;
    });

    return {
      data: data.map((c) => conversationMapper(c, userId)),
    };
  }

  @Get("/conversation/:id/messages")
  async getMessages(
    @Param("id") id: number,
    @QueryParam("userId") userId: number,
  ) {
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      include: { user: true },
    });

    // Only mark messages as seen if they weren't sent by the current user
    const messagesToMarkAsSeen = messages
      .filter((m) => m.userId !== userId && !m.isSeen)
      .map((m) => m.id);

    // Update messages as seen if there are any to update
    if (messagesToMarkAsSeen.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: messagesToMarkAsSeen } },
        data: { isSeen: true },
      });
    }

    return {
      data: mapper(messages, messageMapper),
    };
  }

  @Post("/contacts")
  async getContacts() {
    /* {
      where: { mobile: { in: dto.mobiles } },
    } */
    const users = await prisma.user.findMany();
    return { data: mapper(users, userMapper) };
  }

  @Post("/join/channel/:channelId")
  async joinChannel(
    @Param("channelId") channelId: number,
    @Body() { userId }: { userId: number },
  ) {
    // Check if user is already a participant
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId: channelId,
      },
    });

    if (existingParticipant) {
      return super.error("User is already a member of this channel");
    }

    // Get channel details
    const channel = await prisma.conversation.findUnique({
      where: { id: channelId },
      include: { participants: true },
    });

    if (!channel) {
      return super.error("Channel not found");
    }

    if (channel.type !== ConversationType.CHANNEL) {
      return super.error("This conversation is not a channel");
    }

    if (!channel.isPublic) {
      return super.error("This channel is private, invitation is required");
    }

    // Add user as participant with MEMBER role
    const participant = await prisma.participant.create({
      data: {
        userId,
        conversationId: channelId,
        role: "MEMBER",
      },
      include: { user: true },
    });

    // Add system message that user joined
    await prisma.message.create({
      data: {
        text: `User ${participant.user.name} joined the channel`,
        type: MessageType.INFO,
        userId,
        conversationId: channelId,
      },
    });

    return super.ok({
      success: true,
      participant,
    });
  }

  @Delete("/leave/channel/:channelId")
  async leaveChannel(
    @Param("channelId") channelId: number,
    @Body() { userId }: { userId: number },
  ) {
    const participant = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId: channelId,
      },
      include: { user: true },
    });

    if (!participant) {
      return super.error("User is not a member of this channel");
    }

    // Check if user is the owner
    if (participant.role === "OWNER") {
      // Count other admins
      const adminCount = await prisma.participant.count({
        where: {
          conversationId: channelId,
          role: "ADMIN",
        },
      });

      if (adminCount === 0) {
        return super.error(
          "Cannot leave channel: you are the owner and there are no admins to take over",
        );
      }

      // Promote first admin to owner
      const firstAdmin = await prisma.participant.findFirst({
        where: {
          conversationId: channelId,
          role: "ADMIN",
        },
        include: { user: true },
      });

      if (firstAdmin) {
        await prisma.participant.update({
          where: { id: firstAdmin.id },
          data: { role: "OWNER" },
        });

        // Add system message about ownership transfer
        await prisma.message.create({
          data: {
            text: `${participant.user.name} transferred ownership to ${firstAdmin.user.name}`,
            type: MessageType.INFO,
            userId,
            conversationId: channelId,
          },
        });
      }
    }

    // Add system message that user left
    await prisma.message.create({
      data: {
        text: `${participant.user.name} left the channel`,
        type: MessageType.INFO,
        userId,
        conversationId: channelId,
      },
    });

    // Remove participant
    await prisma.participant.delete({
      where: { id: participant.id },
    });

    return super.ok({
      success: true,
    });
  }

  @Get("/channel/:channelId/participants")
  async getChannelParticipants(@Param("channelId") channelId: number) {
    const participants = await prisma.participant.findMany({
      where: {
        conversationId: channelId,
      },
      include: { user: true },
    });

    return {
      data: participants.map((p) => ({
        ...p,
        user: userMapper(p.user),
      })),
    };
  }

  @Put("/channel/:channelId/participant-role")
  async updateParticipantRole(
    @Param("channelId") channelId: number,
    @Body()
    {
      userId,
      targetUserId,
      newRole,
    }: { userId: number; targetUserId: number; newRole: string },
  ) {
    // Check if the requesting user has permission
    const requester = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId: channelId,
      },
    });

    if (!requester || !["OWNER", "ADMIN"].includes(requester.role as string)) {
      return super.error("You don't have permission to change roles");
    }

    // Get target participant
    const target = await prisma.participant.findFirst({
      where: {
        userId: targetUserId,
        conversationId: channelId,
      },
      include: { user: true },
    });

    if (!target) {
      return super.error("Target user is not a member of this channel");
    }

    // Only owner can promote to admin or modify admin roles
    if (
      (newRole === "ADMIN" || target.role === "ADMIN") &&
      requester.role !== "OWNER"
    ) {
      return super.error(
        "Only the owner can promote to admin or modify admin roles",
      );
    }

    // Update role
    const updatedParticipant = await prisma.participant.update({
      where: { id: target.id },
      data: { role: newRole as ParticipantRole },
      include: { user: true },
    });

    // Add system message about role change
    await prisma.message.create({
      data: {
        text: `${target.user.name}'s role changed to ${newRole}`,
        type: MessageType.INFO,
        userId,
        conversationId: channelId,
      },
    });

    return super.ok({
      participant: {
        ...updatedParticipant,
        user: userMapper(updatedParticipant.user),
      },
    });
  }
}
