import { Server, Socket } from "socket.io";
import http from "http";
import { prisma } from "./prisma";
import { messageMapper, userMapper } from "./mappers";
import { CallService } from "./callSockets";
import socketService from "./socketService";

function configureSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Set the io instance in our socket service
  socketService.setIo(io);

  const callService = new CallService(io);

  io.on("connection", async (socket: Socket) => {
    callService.setupSignaling(socket);

    console.log("A user connected:", socket.id);
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
  });
}

export default configureSocket;
