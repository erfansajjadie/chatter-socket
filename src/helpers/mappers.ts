import { ConversationType, Prisma, User } from "@prisma/client";
import { getAvatarUrl, getFileUrl, getTimeFormat } from "./functions";

export function mapper<T, R>(list: T[], mappingFunction: (item: T) => R): R[] {
  return list.map(mappingFunction);
}

type ConversationFull = Prisma.ConversationGetPayload<{
  include: {
    _count: {
      select: {
        messages: true;
      };
    };
    participants: { include: { user: true } };
    messages: { include: { user: true } };
  };
}>;

type MessageFull = Prisma.MessageGetPayload<{
  include: { user: true; replyTo: { include: { user: true } } };
}>;

type MessageShort = Prisma.MessageGetPayload<{
  include: { user: true };
}>;

export function userMapper(user: User) {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    avatar: getAvatarUrl(user.avatar),
  };
}

export function conversationMapper(data: ConversationFull, userId: number) {
  let name;
  let image;
  let isOnline = false;
  let receiverId;
  let ownerId;
  let adminIds: number[] = [];

  if (
    data.type == ConversationType.GROUP ||
    data.type == ConversationType.CHANNEL
  ) {
    name = data.name;
    image = getFileUrl(data.image);
    // Find the owner/admin of the group or channel
    const admin = data.participants.find((p) => p.role === "OWNER");
    ownerId = admin?.userId;

    // Get all participants with admin roles (OWNER, ADMIN, MODERATOR)
    adminIds = data.participants
      .filter(
        (p) =>
          p.role === "OWNER" || p.role === "ADMIN" || p.role === "MODERATOR",
      )
      .map((p) => p.userId);
  } else {
    const receiver = data.participants.find((p) => p.userId != userId);
    name = receiver?.user.name;
    image = getAvatarUrl(receiver?.user.avatar);
    isOnline = receiver?.user.isOnline ?? false;
    receiverId = receiver?.userId;
  }

  return {
    id: data.id,
    name,
    image,
    type: data.type,
    isOnline,
    receiverId,
    ownerId: ownerId,
    adminIds: adminIds,
    isPublic: data.isPublic,
    tags: data.tags ? data.tags.split(",") : [],
    description: data.description,
    lastOnlineTime: getTimeFormat(data.updatedAt),
    unreadCount: data._count.messages,
    participantsCount: data.participants.length,
    ...(data.messages.length > 0
      ? { lastMessage: messageMapper(data.messages[0]) }
      : null),
  };
}

export function messageMapper(data: MessageShort) {
  return {
    id: data.id,
    text: data.text,
    date: getTimeFormat(data.createdAt),
    dateTime: data.createdAt.toISOString(), // Add raw ISO date string for the client to parse
    senderName: data.user.name,
    conversationId: data.conversationId,
    type: data.type,
    file: getFileUrl(data.file),
    senderId: data.user.id,
    voiceDuration: data.voiceDuration,
    isSeen: data.isSeen,
    fileName: data.fileName,
    fileSize: data.fileSize,
    senderAvatar: getFileUrl(data.user.avatar),
  };
}

export function messageFullMapper(data: MessageFull) {
  return {
    id: data.id,
    text: data.text,
    date: getTimeFormat(data.createdAt),
    dateTime: data.createdAt.toISOString(), // Add raw ISO date string for the client to parse
    senderName: data.user.name,
    conversationId: data.conversationId,
    type: data.type,
    file: getFileUrl(data.file),
    senderId: data.user.id,
    voiceDuration: data.voiceDuration,
    isSeen: data.isSeen,
    senderAvatar: getAvatarUrl(data.user.avatar),
    // Add reply information
    replyToId: data.replyToId,
    replyTo: data.replyTo
      ? {
          id: data.replyTo.id,
          text: data.replyTo.text,
          senderName: data.replyTo.user?.name,
          senderId: data.replyTo.user?.id,
          type: data.replyTo.type,
          file: getAvatarUrl(data.replyTo.file),
        }
      : null,
  };
}
