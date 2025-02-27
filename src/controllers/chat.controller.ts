import BaseController from "./base.controller";
import {
  Body,
  Get,
  JsonController,
  Param,
  Post,
  UploadedFile,
} from "routing-controllers";
import { ConversationDto } from "../entities/conversation.dto";
import { ConversationType, User } from "@prisma/client";
import { prisma } from "../helpers/prisma";
import { uploadOptions } from "../helpers/storage";
import {
  conversationMapper,
  mapper,
  messageMapper,
  userMapper,
} from "../helpers/mappers";
import { ContactDto } from "../entities/contact.dto";

@JsonController()
export class ChatController extends BaseController {
  @Post("/create/conversation")
  async createConversation(
    @Body() dto: ConversationDto,
    @UploadedFile("image", { options: uploadOptions("group-images") })
    file: any,
  ) {
    const { type, participants, name } = dto;

    const image = file?.path?.replace("public_html/", "");

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
          },
        },
        participants: { take: 2, include: { user: true } },
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
      },
    });

    // Create participants for the conversation
    await prisma.participant.createMany({
      data: [
        {
          userId: dto.userId,
          conversationId: conversation.id,
        },
        ...participants.map((p) => {
          return {
            userId: p,
            conversationId: conversation.id,
          };
        }),
      ],
    });

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
          },
        },
        participants: { take: 2, include: { user: true } },
        messages: { orderBy: { id: "desc" }, take: 1, include: { user: true } },
      },
    });

    const data = conversations.filter((c) =>
      c.type == ConversationType.GROUP ? true : c.messages.length > 0,
    );

    return {
      data: data.map((c) => conversationMapper(c, userId)),
    };
  }

  @Get("/conversation/:id/messages")
  async getMessages(@Param("id") id: number) {
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      include: { user: true },
    });
    const ids = messages.map((m) => m.id);
    // update private messages is seen
    await prisma.message.updateMany({
      where: { id: { in: ids } },
      data: { isSeen: true },
    });
    return {
      data: mapper(messages, messageMapper),
    };
  }

  @Post("/contacts")
  async getContacts(@Body() dto: ContactDto) {
    /* {
      where: { mobile: { in: dto.mobiles } },
    } */
    const users = await prisma.user.findMany();
    return { data: mapper(users, userMapper) };
  }
}
