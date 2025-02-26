import { Server, Socket } from "socket.io";
import http from "http";
import { prisma } from "./prisma";
import { MessageType } from "@prisma/client";
import { uploadBase64 } from "./storage";
import { messageMapper, userMapper } from "./mappers";

function configureSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);

    socket.on("sendMessage", async (data) => {
      try {
        const { userId, conversationId, text } = data;

        // Save the message to the database
        const message = await prisma.message.create({
          include: { user: true },
          data: {
            text,
            userId,
            conversationId,
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
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on("joinConversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
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

    socket.on("sendFile", async (data) => {
      try {
        const { userId, conversationId, file, fileType, type, voiceDuration } =
          data;

        console.log(fileType);

        if (!["FILE", "VOICE", "IMAGE"].includes(type)) {
          return;
        }

        const messageType = MessageType[type as keyof typeof MessageType];

        const result = await uploadBase64(file, fileType);
        // Save the voice message to the database
        const message = await prisma.message.create({
          include: { user: true },
          data: {
            file: result?.replace("public_html/", ""),
            userId,
            text: "file",
            type: messageType,
            conversationId,
            voiceDuration,
          },
        });

        // Emit the voice message to the conversation room
        const messageData = { message: messageMapper(message) };

        // Emit the message to the conversation room, including the sender's socket
        socket
          .to(`conversation_${conversationId}`)
          .emit("receiveMessage", messageData);

        // Also emit the message to the sender's socket
        socket.emit("receiveMessage", messageData);
      } catch (error) {
        console.error("Error sending voice message:", error);
      }
    });
  });
}

export default configureSocket;
