"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const prisma_1 = require("./prisma");
const mappers_1 = require("./mappers");
const callSockets_1 = require("./callSockets");
const socketService_1 = __importDefault(require("./socketService"));
function configureSocket(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
        },
    });
    // Set the io instance in our socket service
    socketService_1.default.setIo(io);
    const callService = new callSockets_1.CallService(io);
    io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        callService.setupSignaling(socket);
        console.log("A user connected:", socket.id);
        // Update user status to online
        const userId = socket.handshake.query.userId;
        if (userId) {
            yield prisma_1.prisma.user.update({
                where: { id: Number(userId) },
                data: { isOnline: true, socketId: socket.id },
            });
            // Emit user online event
            io.emit("userOnline", { userId: Number(userId) });
        }
        socket.on("sendMessage", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, conversationId, text, type, file, voiceDuration } = data;
                console.log("Received message:", data);
                // Save the message to the database
                const message = yield prisma_1.prisma.message.create({
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
                const messageData = { message: (0, mappers_1.messageMapper)(message) };
                // Emit the message to the conversation room, including the sender's socket
                socket
                    .to(`conversation_${conversationId}`)
                    .emit("receiveMessage", messageData);
                // Also emit the message to the sender's socket
                socket.emit("receiveMessage", messageData);
                yield prisma_1.prisma.conversation.update({
                    where: { id: conversationId },
                    data: { lastMessageDate: new Date() },
                });
                console.log("Message sent successfully at ", new Date());
            }
            catch (error) {
                console.error("Error sending message:", error);
            }
        }));
        socket.on("joinConversation", (conversationId) => {
            socket.join(`conversation_${conversationId}`);
            console.log(`User ${socket.id} joined conversation ${conversationId}`);
        });
        socket.on("disconnect", () => __awaiter(this, void 0, void 0, function* () {
            console.log("A user disconnected:", socket.id);
            // Update user status to offline
            if (userId) {
                yield prisma_1.prisma.user.update({
                    where: { id: Number(userId) },
                    data: { isOnline: false, socketId: null, updatedAt: new Date() },
                });
                // Emit user offline event
                io.emit("userOffline", { userId: Number(userId) });
            }
        }));
        // "Typing" events
        socket.on("startTyping", (data) => __awaiter(this, void 0, void 0, function* () {
            const { conversationId, userId } = data;
            const user = yield prisma_1.prisma.user.findUnique({ where: { id: userId } });
            socket
                .to(`conversation_${conversationId}`)
                .emit("userTyping", { user: (0, mappers_1.userMapper)(user), conversationId });
        }));
        socket.on("stopTyping", (data) => {
            const { conversationId, userId } = data;
            socket
                .to(`conversation_${conversationId}`)
                .emit("userStoppedTyping", { conversationId, userId });
        });
        socket.on("seenMessages", (data) => __awaiter(this, void 0, void 0, function* () {
            const { conversationId, userId } = data;
            yield prisma_1.prisma.conversation.update({
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
        }));
    }));
}
exports.default = configureSocket;
