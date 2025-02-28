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
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const prisma_1 = require("./prisma");
const client_1 = require("@prisma/client");
const storage_1 = require("./storage");
const mappers_1 = require("./mappers");
const callSockets_1 = require("./callSockets");
function configureSocket(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
        },
    });
    const callService = new callSockets_1.CallService(io);
    io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
        console.log("A user connected:", socket.id);
        callService.setupSignaling(socket);
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
                const { userId, conversationId, text } = data;
                // Save the message to the database
                const message = yield prisma_1.prisma.message.create({
                    include: { user: true },
                    data: {
                        text,
                        userId,
                        conversationId,
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
                    data: { isOnline: false, socketId: null },
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
        socket.on("sendFile", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, conversationId, file, fileType, type, voiceDuration } = data;
                console.log(fileType);
                if (!["FILE", "VOICE", "IMAGE"].includes(type)) {
                    return;
                }
                const messageType = client_1.MessageType[type];
                const result = yield (0, storage_1.uploadBase64)(file, fileType);
                // Save the voice message to the database
                const message = yield prisma_1.prisma.message.create({
                    include: { user: true },
                    data: {
                        file: result === null || result === void 0 ? void 0 : result.replace("public_html/", ""),
                        userId,
                        text: "file",
                        type: messageType,
                        conversationId,
                        voiceDuration,
                    },
                });
                // Emit the voice message to the conversation room
                const messageData = { message: (0, mappers_1.messageMapper)(message) };
                // Emit the message to the conversation room, including the sender's socket
                socket
                    .to(`conversation_${conversationId}`)
                    .emit("receiveMessage", messageData);
                // Also emit the message to the sender's socket
                socket.emit("receiveMessage", messageData);
            }
            catch (error) {
                console.error("Error sending voice message:", error);
            }
        }));
    }));
}
exports.default = configureSocket;
