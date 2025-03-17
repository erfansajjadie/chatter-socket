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
                const { userId, conversationId, text, type, file, voiceDuration } = data;
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
        // Channel-specific events
        socket.on("joinChannelRoom", (data) => __awaiter(this, void 0, void 0, function* () {
            const { channelId, userId } = data;
            // Check if user is a participant of the channel
            const participant = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId: Number(userId),
                    conversationId: Number(channelId),
                },
            });
            if (participant) {
                socket.join(`conversation_${channelId}`);
                console.log(`User ${socket.id} joined channel ${channelId}`);
            }
            else {
                console.log(`User ${socket.id} attempted to join channel ${channelId} but is not a participant`);
            }
        }));
        socket.on("leaveChannelRoom", (channelId) => {
            socket.leave(`conversation_${channelId}`);
            console.log(`User ${socket.id} left channel ${channelId}`);
        });
        socket.on("sendChannelMessage", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, channelId, text } = data;
                // Check if user is a participant of the channel
                const participant = yield prisma_1.prisma.participant.findFirst({
                    where: {
                        userId: Number(userId),
                        conversationId: Number(channelId),
                    },
                });
                if (!participant) {
                    console.log(`User ${userId} attempted to send message to channel ${channelId} but is not a participant`);
                    socket.emit("channelError", {
                        error: "You are not a participant of this channel",
                        channelId,
                    });
                    return;
                }
                // Save the message to the database
                const message = yield prisma_1.prisma.message.create({
                    include: { user: true },
                    data: {
                        text,
                        userId,
                        conversationId: channelId,
                    },
                });
                const messageData = { message: (0, mappers_1.messageMapper)(message), channelId };
                // Emit the message to the channel room
                io.to(`conversation_${channelId}`).emit("receiveChannelMessage", messageData);
                yield prisma_1.prisma.conversation.update({
                    where: { id: channelId },
                    data: { lastMessageDate: new Date() },
                });
            }
            catch (error) {
                console.error("Error sending channel message:", error);
            }
        }));
        socket.on("updateChannelInfo", (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, channelId, name, description, isPublic } = data;
            try {
                // Check if user has permission to update channel
                const participant = yield prisma_1.prisma.participant.findFirst({
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
                const updatedChannel = yield prisma_1.prisma.conversation.update({
                    where: { id: channelId },
                    data: {
                        name,
                        description,
                        isPublic,
                    },
                });
                // Create info message
                yield prisma_1.prisma.message.create({
                    data: {
                        text: `Channel information has been updated`,
                        type: client_1.MessageType.INFO,
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
            }
            catch (error) {
                console.error("Error updating channel info:", error);
                socket.emit("channelError", {
                    error: "Failed to update channel information",
                    channelId,
                });
            }
        }));
        socket.on("inviteToChannel", (data) => __awaiter(this, void 0, void 0, function* () {
            const { senderId, channelId, invitedUserIds } = data;
            try {
                // Check if sender has permission to invite
                const sender = yield prisma_1.prisma.participant.findFirst({
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
                const channel = yield prisma_1.prisma.conversation.findUnique({
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
                const existingParticipants = yield prisma_1.prisma.participant.findMany({
                    where: {
                        conversationId: channelId,
                        userId: { in: invitedUserIds },
                    },
                    select: { userId: true },
                });
                const existingUserIds = existingParticipants.map((p) => p.userId);
                const newUserIds = invitedUserIds.filter((id) => !existingUserIds.includes(id));
                // Add new participants
                if (newUserIds.length > 0) {
                    yield prisma_1.prisma.participant.createMany({
                        data: newUserIds.map((userId) => ({
                            userId,
                            conversationId: channelId,
                            role: "MEMBER",
                        })),
                    });
                    // Get user info for invited users
                    const invitedUsers = yield prisma_1.prisma.user.findMany({
                        where: { id: { in: newUserIds } },
                    });
                    // Create info message
                    yield prisma_1.prisma.message.create({
                        data: {
                            text: `${sender.user.name} invited ${invitedUsers
                                .map((u) => u.name)
                                .join(", ")} to the channel`,
                            type: client_1.MessageType.INFO,
                            userId: senderId,
                            conversationId: channelId,
                        },
                    });
                    // Notify channel about new members
                    io.to(`conversation_${channelId}`).emit("channelMembersUpdated", {
                        channelId,
                        action: "added",
                        members: invitedUsers.map(mappers_1.userMapper),
                    });
                    // Notify invited users
                    for (const userId of newUserIds) {
                        const userSocket = yield findUserSocket(userId);
                        if (userSocket) {
                            io.to(userSocket).emit("channelInvitation", {
                                channelId,
                                channelName: channel.name,
                                invitedBy: (0, mappers_1.userMapper)(sender.user),
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error("Error inviting to channel:", error);
                socket.emit("channelError", {
                    error: "Failed to invite users to channel",
                    channelId,
                });
            }
        }));
        // Helper function to find a user's socket by their user ID
        function findUserSocket(userId) {
            return __awaiter(this, void 0, void 0, function* () {
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { socketId: true },
                });
                return user === null || user === void 0 ? void 0 : user.socketId;
            });
        }
    }));
}
exports.default = configureSocket;
