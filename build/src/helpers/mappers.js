"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapper = mapper;
exports.userMapper = userMapper;
exports.conversationMapper = conversationMapper;
exports.messageMapper = messageMapper;
exports.messageFullMapper = messageFullMapper;
const client_1 = require("@prisma/client");
const functions_1 = require("./functions");
function mapper(list, mappingFunction) {
    return list.map(mappingFunction);
}
function userMapper(user) {
    return {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        avatar: (0, functions_1.getAvatarUrl)(user.avatar),
    };
}
function conversationMapper(data, userId) {
    var _a;
    let name;
    let image;
    let isOnline = false;
    let receiverId;
    let ownerId;
    let adminIds = [];
    if (data.type == client_1.ConversationType.GROUP ||
        data.type == client_1.ConversationType.CHANNEL) {
        name = data.name;
        image = (0, functions_1.getFileUrl)(data.image);
        // Find the owner/admin of the group or channel
        const admin = data.participants.find((p) => p.role === "OWNER");
        ownerId = admin === null || admin === void 0 ? void 0 : admin.userId;
        // Get all participants with admin roles (OWNER, ADMIN, MODERATOR)
        adminIds = data.participants
            .filter((p) => p.role === "OWNER" || p.role === "ADMIN" || p.role === "MODERATOR")
            .map((p) => p.userId);
    }
    else {
        const receiver = data.participants.find((p) => p.userId != userId);
        name = receiver === null || receiver === void 0 ? void 0 : receiver.user.name;
        image = (0, functions_1.getAvatarUrl)(receiver === null || receiver === void 0 ? void 0 : receiver.user.avatar);
        isOnline = (_a = receiver === null || receiver === void 0 ? void 0 : receiver.user.isOnline) !== null && _a !== void 0 ? _a : false;
        receiverId = receiver === null || receiver === void 0 ? void 0 : receiver.userId;
    }
    return Object.assign({ id: data.id, name,
        image, type: data.type, isOnline,
        receiverId, ownerId: ownerId, adminIds: adminIds, isPublic: data.isPublic, tags: data.tags ? data.tags.split(",") : [], description: data.description, lastOnlineTime: (0, functions_1.getTimeFormat)(data.updatedAt), unreadCount: data._count.messages, participantsCount: data.participants.length }, (data.messages.length > 0
        ? { lastMessage: messageMapper(data.messages[0]) }
        : null));
}
function messageMapper(data) {
    return {
        id: data.id,
        text: data.text,
        date: (0, functions_1.getTimeFormat)(data.createdAt),
        dateTime: data.createdAt.toISOString(), // Add raw ISO date string for the client to parse
        senderName: data.user.name,
        conversationId: data.conversationId,
        type: data.type,
        file: (0, functions_1.getFileUrl)(data.file),
        senderId: data.user.id,
        voiceDuration: data.voiceDuration,
        isSeen: data.isSeen,
        fileName: data.fileName,
        fileSize: data.fileSize,
        senderAvatar: (0, functions_1.getFileUrl)(data.user.avatar),
    };
}
function messageFullMapper(data) {
    var _a, _b;
    return {
        id: data.id,
        text: data.text,
        date: (0, functions_1.getTimeFormat)(data.createdAt),
        dateTime: data.createdAt.toISOString(), // Add raw ISO date string for the client to parse
        senderName: data.user.name,
        conversationId: data.conversationId,
        type: data.type,
        file: (0, functions_1.getFileUrl)(data.file),
        senderId: data.user.id,
        voiceDuration: data.voiceDuration,
        isSeen: data.isSeen,
        senderAvatar: (0, functions_1.getAvatarUrl)(data.user.avatar),
        // Add reply information
        replyToId: data.replyToId,
        replyTo: data.replyTo
            ? {
                id: data.replyTo.id,
                text: data.replyTo.text,
                senderName: (_a = data.replyTo.user) === null || _a === void 0 ? void 0 : _a.name,
                senderId: (_b = data.replyTo.user) === null || _b === void 0 ? void 0 : _b.id,
                type: data.replyTo.type,
                file: (0, functions_1.getAvatarUrl)(data.replyTo.file),
            }
            : null,
    };
}
