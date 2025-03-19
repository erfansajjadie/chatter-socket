import { Server, Socket } from "socket.io";
import http from "http";
import { prisma } from "./prisma";
import { MessageType } from "@prisma/client";
import { messageMapper, userMapper } from "./mappers";
import { CallService } from "./callSockets";

function configureSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const callService = new CallService(io);

  io.on("connection", async (socket: Socket) => {
    console.log("A user connected:", socket.id);

    callService.setupSignaling(socket);

    // Update user status to online
    const userId = socket.handshake.query.userId;
    if (userId) {
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { isOnline: true, socketId: socket.id },
      });

      // Emit user online event
      io.emit("userOnline", { userId: Number(userId) });
    }

    socket.on("sendMessage", async (data) => {
      try {
        const { userId, conversationId, text, type, file, voiceDuration } =
          data;

        console.log("Received message:", data);

        // Save the message to the database
        const message = await prisma.message.create({
          include: { user: true },
          data: {
            text,
            userId,
            conversationId,
            type,
            file,
            voiceDuration,
          },
        });
        const messageData = { message: messageMapper(message) };

        // Emit the message to the conversation room, including the sender's socket
        socket
          .to(`conversation_${conversationId}`)
          .emit("receiveMessage", messageData);

        // Also emit the message to the sender's socket
        socket.emit("receiveMessage", messageData);

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageDate: new Date() },
        });
        console.log("Message sent successfully at ", new Date());
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on("joinConversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on("disconnect", async () => {
      console.log("A user disconnected:", socket.id);

      // Update user status to offline
      if (userId) {
        await prisma.user.update({
          where: { id: Number(userId) },
          data: { isOnline: false, socketId: null, updatedAt: new Date() },
        });

        // Emit user offline event
        io.emit("userOffline", { userId: Number(userId) });
      }
    });

    // "Typing" events
    socket.on("startTyping", async (data) => {
      const { conversationId, userId } = data;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      socket
        .to(`conversation_${conversationId}`)
        .emit("userTyping", { user: userMapper(user!), conversationId });
    });

    socket.on("stopTyping", (data) => {
      const { conversationId, userId } = data;

      socket
        .to(`conversation_${conversationId}`)
        .emit("userStoppedTyping", { conversationId, userId });
    });

    socket.on("seenMessages", async (data) => {
      const { conversationId, userId } = data;

      await prisma.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          messages: {
            updateMany: {
              where: { userId: { not: userId } },
              data: { isSeen: true },
            },
          },
        },
      });

      socket
        .to(`conversation_${conversationId}`)
        .emit("seenMessage", { conversationId, userId });
    });

    // Channel-specific events
    socket.on("joinChannelRoom", async (data) => {
      const { channelId, userId } = data;

      // Check if user is a participant of the channel
      const participant = await prisma.participant.findFirst({
        where: {
          userId: Number(userId),
          conversationId: Number(channelId),
        },
      });

      if (participant) {
        socket.join(`conversation_${channelId}`);
        console.log(`User ${socket.id} joined channel ${channelId}`);
      } else {
        console.log(
          `User ${socket.id} attempted to join channel ${channelId} but is not a participant`,
        );
      }
    });

    socket.on("leaveChannelRoom", (channelId) => {
      socket.leave(`conversation_${channelId}`);
      console.log(`User ${socket.id} left channel ${channelId}`);
    });

    socket.on("sendChannelMessage", async (data) => {
      try {
        const { userId, channelId, text } = data;

        // Check if user is a participant of the channel
        const participant = await prisma.participant.findFirst({
          where: {
            userId: Number(userId),
            conversationId: Number(channelId),
          },
        });

        if (!participant) {
          console.log(
            `User ${userId} attempted to send message to channel ${channelId} but is not a participant`,
          );
          socket.emit("channelError", {
            error: "You are not a participant of this channel",
            channelId,
          });
          return;
        }

        // Save the message to the database
        const message = await prisma.message.create({
          include: { user: true },
          data: {
            text,
            userId,
            conversationId: channelId,
          },
        });
        const messageData = { message: messageMapper(message), channelId };

        // Emit the message to the channel room
        io.to(`conversation_${channelId}`).emit(
          "receiveChannelMessage",
          messageData,
        );

        await prisma.conversation.update({
          where: { id: channelId },
          data: { lastMessageDate: new Date() },
        });
      } catch (error) {
        console.error("Error sending channel message:", error);
      }
    });

    socket.on("updateChannelInfo", async (data) => {
      const { userId, channelId, name, description, isPublic } = data;

      try {
        // Check if user has permission to update channel
        const participant = await prisma.participant.findFirst({
          where: {
            userId: Number(userId),
            conversationId: Number(channelId),
            role: { in: ["OWNER", "ADMIN"] },
          },
        });

        if (!participant) {
          socket.emit("channelError", {
            error: "You don't have permission to update this channel",
            channelId,
          });
          return;
        }

        // Update channel info
        const updatedChannel = await prisma.conversation.update({
          where: { id: channelId },
          data: {
            name,
            description,
            isPublic,
          },
        });

        // Create info message
        await prisma.message.create({
          data: {
            text: `Channel information has been updated`,
            type: MessageType.INFO,
            userId,
            conversationId: channelId,
          },
        });

        // Notify all channel members about the update
        io.to(`conversation_${channelId}`).emit("channelInfoUpdated", {
          channelId,
          name,
          description,
          isPublic,
        });
      } catch (error) {
        console.error("Error updating channel info:", error);
        socket.emit("channelError", {
          error: "Failed to update channel information",
          channelId,
        });
      }
    });

    socket.on("inviteToChannel", async (data) => {
      const { senderId, channelId, invitedUserIds } = data;

      try {
        // Check if sender has permission to invite
        const sender = await prisma.participant.findFirst({
          where: {
            userId: Number(senderId),
            conversationId: Number(channelId),
            role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
          },
          include: { user: true },
        });

        if (!sender) {
          socket.emit("channelError", {
            error: "You don't have permission to invite users to this channel",
            channelId,
          });
          return;
        }

        const channel = await prisma.conversation.findUnique({
          where: { id: channelId },
        });

        if (!channel) {
          socket.emit("channelError", {
            error: "Channel not found",
            channelId,
          });
          return;
        }

        // Get existing participants to avoid duplicates
        const existingParticipants = await prisma.participant.findMany({
          where: {
            conversationId: channelId,
            userId: { in: invitedUserIds },
          },
          select: { userId: true },
        });

        const existingUserIds = existingParticipants.map((p) => p.userId);
        const newUserIds = invitedUserIds.filter(
          (id: any) => !existingUserIds.includes(id),
        );

        // Add new participants
        if (newUserIds.length > 0) {
          await prisma.participant.createMany({
            data: newUserIds.map((userId: any) => ({
              userId,
              conversationId: channelId,
              role: "MEMBER",
            })),
          });

          // Get user info for invited users
          const invitedUsers = await prisma.user.findMany({
            where: { id: { in: newUserIds } },
          });

          // Create info message
          await prisma.message.create({
            data: {
              text: `${sender.user.name} invited ${invitedUsers
                .map((u) => u.name)
                .join(", ")} to the channel`,
              type: MessageType.INFO,
              userId: senderId,
              conversationId: channelId,
            },
          });

          // Notify channel about new members
          io.to(`conversation_${channelId}`).emit("channelMembersUpdated", {
            channelId,
            action: "added",
            members: invitedUsers.map(userMapper),
          });

          // Notify invited users
          for (const userId of newUserIds) {
            const userSocket = await findUserSocket(userId);
            if (userSocket) {
              io.to(userSocket).emit("channelInvitation", {
                channelId,
                channelName: channel.name,
                invitedBy: userMapper(sender.user),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error inviting to channel:", error);
        socket.emit("channelError", {
          error: "Failed to invite users to channel",
          channelId,
        });
      }
    });

    // Helper function to find a user's socket by their user ID
    async function findUserSocket(userId: number) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { socketId: true },
      });
      return user?.socketId;
    }
  });
}

export default configureSocket;
