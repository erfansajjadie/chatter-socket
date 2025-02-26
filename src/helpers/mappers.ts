import { ConversationType, Prisma, User } from "@prisma/client";
import { getFileUrl, getTimeFormat } from "./functions";

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
  include: { user: true };
}>;

export function userMapper(user: User) {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    avatar: getFileUrl(user.avatar),
  };
}

export function conversationMapper(data: ConversationFull, userId: number) {
  let name;
  let image;

  if (data.type == ConversationType.GROUP) {
    name = data.name;
    image = data.image;
  } else {
    const receiver = data.participants.find((p) => p.userId != userId);
    name = receiver?.user.name;
    image = receiver?.user.avatar;
  }

  return {
    id: data.id,
    name,
    image: getFileUrl(image),
    type: data.type,
    unreadCount: data._count.messages,
    ...(data.messages.length > 0
      ? { lastMessage: messageMapper(data.messages[0]) }
      : null),
  };
}

export function messageMapper(data: MessageFull) {
  return {
    id: data.id,
    text: data.text,
    date: getTimeFormat(data.createdAt),
    senderName: data.user.name,
    conversationId: data.conversationId,
    type: data.type,
    file: getFileUrl(data.file),
    senderId: data.user.id,
    voiceDuration: data.voiceDuration,
    isSeen: data.isSeen,
    senderAvatar: getFileUrl(data.user.avatar),
  };
}
