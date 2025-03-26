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
import socketService from "../helpers/socketService";

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
      console.log("File received:", file);
      image = saveFile(file, "conversation_images");
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
        isPublic: type === ConversationType.CHANNEL ? isPublic == "true" : null,
        lastMessageDate: new Date(),
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
    // Fetch both messages and conversation in parallel
    const [messages, conversation] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        include: { user: true },
      }),
      prisma.conversation.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              messages: { where: { userId: { not: userId }, isSeen: false } },
              participants: true,
            },
          },
          participants: {
            include: { user: true },
          },
          messages: {
            orderBy: { id: "desc" },
            take: 1,
            include: { user: true },
          },
        },
      }),
    ]);

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
      conversation: conversation
        ? conversationMapper(conversation, userId)
        : null,
    };
  }

  @Get("/conversation/:id/get-participants")
  async getConversationParticipants(@Param("id") id: number) {
    const participants = await prisma.participant.findMany({
      where: {
        conversationId: id,
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

  @Delete("/conversation/:conversationId/remove-participant")
  async removeParticipant(
    @Param("conversationId") conversationId: number,
    @Body()
    { userId, targetUserId }: { userId: number; targetUserId: number },
  ) {
    // Check if the requesting user has permission
    const requester = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId,
      },
      include: { conversation: true },
    });

    if (!requester) {
      return super.error("You are not a participant of this conversation");
    }

    // Verify this is a channel or group
    if (
      requester.conversation.type !== ConversationType.CHANNEL &&
      requester.conversation.type !== ConversationType.GROUP
    ) {
      return super.error(
        "This conversation does not support participant management",
      );
    }

    // Only owners and admins can remove participants
    if (!["OWNER", "ADMIN"].includes(requester.role as string)) {
      return super.error("You don't have permission to remove participants");
    }

    // Get target participant
    const targetParticipant = await prisma.participant.findFirst({
      where: {
        userId: targetUserId,
        conversationId,
      },
      include: { user: true },
    });

    if (!targetParticipant) {
      return super.error("Target user is not a member of this conversation");
    }

    // Cannot remove the owner
    if (targetParticipant.role === "OWNER") {
      return super.error("The conversation owner cannot be removed");
    }

    // Admin cannot remove another admin
    if (requester.role === "ADMIN" && targetParticipant.role === "ADMIN") {
      return super.error("Admins cannot remove other admins");
    }

    // Add system message that user was removed
    const message = await prisma.message.create({
      data: {
        text: `${targetParticipant.user.name} was removed from the conversation`,
        type: MessageType.INFO,
        userId,
        conversationId,
      },
      include: { user: true },
    });

    // Emit message via socket service
    socketService.emitToConversation(conversationId, "receiveMessage", {
      message: messageMapper(message),
    });

    // Remove participant
    await prisma.participant.delete({
      where: { id: targetParticipant.id },
    });

    // Update last message date
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageDate: new Date() },
    });

    return super.ok({
      success: true,
      removedParticipant: {
        ...targetParticipant,
        user: userMapper(targetParticipant.user),
      },
    });
  }

  @Post("/conversation/:conversationId/add-participant")
  async addParticipant(
    @Param("conversationId") conversationId: number,
    @Body()
    {
      userId,
      targetUserId,
      role = "MEMBER",
    }: { userId: number; targetUserId: number; role?: ParticipantRole },
  ) {
    // Check if the requesting user has permission
    const requester = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId,
      },
      include: { conversation: true },
    });

    if (!requester) {
      return super.error("You are not a participant of this conversation");
    }

    // For channels and groups, only owners and admins can add participants
    if (
      (requester.conversation.type === ConversationType.CHANNEL ||
        requester.conversation.type === ConversationType.GROUP) &&
      !["OWNER", "ADMIN"].includes(requester.role as string)
    ) {
      return super.error("You don't have permission to add participants");
    }

    // Check if target user is already a participant
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        userId: targetUserId,
        conversationId,
      },
    });

    if (existingParticipant) {
      return super.error("User is already a participant of this conversation");
    }

    // Get target user details
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return super.error("Target user not found");
    }

    // Add participant with the specified role
    const participant = await prisma.participant.create({
      data: {
        userId: targetUserId,
        conversationId,
        role,
      },
      include: { user: true },
    });

    // Add system message that user was added
    const message = await prisma.message.create({
      data: {
        text: `${targetUser.name} was added to the conversation`,
        type: MessageType.INFO,
        userId,
        conversationId,
      },
      include: { user: true },
    });

    // Emit message via socket service
    socketService.emitToConversation(conversationId, "receiveMessage", {
      message: messageMapper(message),
    });

    return super.ok({
      success: true,
      participant: {
        ...participant,
        user: userMapper(participant.user),
      },
    });
  }

  @Post("/contacts")
  async getContacts() {
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

  @Delete("/leave/conversation/:conversationId")
  async leaveChannel(
    @Param("conversationId") conversationId: number,
    @Body() { userId }: { userId: number },
  ) {
    const participant = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId,
      },
      include: { user: true },
    });

    if (!participant) {
      return super.error("User is not a member of this channel");
    }

    // Check if user is the owner
    if (participant.role === "OWNER") {
      return super.error(
        "Cannot leave channel: you are the owner and there are no admins to take over",
      );
    }

    // Add system message that user left
    const message = await prisma.message.create({
      data: {
        text: `${participant.user.name} left the channel`,
        type: MessageType.INFO,
        userId,
        conversationId: conversationId,
      },
      include: { user: true },
    });

    // Emit message via socket service
    socketService.emitToConversation(conversationId, "receiveMessage", {
      message: messageMapper(message),
    });

    // Remove participant
    await prisma.participant.delete({
      where: { id: participant.id },
    });

    // Update last message date
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageDate: new Date() },
    });

    return super.ok({
      success: true,
    });
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

  @Delete("/delete/conversation/:conversationId")
  async deleteConversation(
    @Param("conversationId") conversationId: number,
    @Body() { userId }: { userId: number },
  ) {
    // Check if the requesting user is the owner of the conversation
    const participant = await prisma.participant.findFirst({
      where: {
        userId,
        conversationId,
        role: "OWNER",
      },
      include: { conversation: true },
    });

    if (!participant) {
      return super.error("Only the owner can delete this conversation");
    }

    // Verify this is a channel or group
    if (
      participant.conversation.type !== ConversationType.CHANNEL &&
      participant.conversation.type !== ConversationType.GROUP
    ) {
      return super.error("Only channels and groups can be deleted");
    }

    // Delete the conversation (this will cascade delete messages and participants)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return super.ok({
      success: true,
      deletedConversationId: conversationId,
    });
  }
}
