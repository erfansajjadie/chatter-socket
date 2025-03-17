"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapper = mapper;
exports.userMapper = userMapper;
exports.conversationMapper = conversationMapper;
exports.messageMapper = messageMapper;
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
        avatar: (0, functions_1.getFileUrl)(user.avatar),
    };
}
function conversationMapper(data, userId) {
    var _a;
    let name;
    let image;
    let isOnline = false;
    let receiverId;
    if (data.type == client_1.ConversationType.GROUP ||
        data.type == client_1.ConversationType.CHANNEL) {
        name = data.name;
        image = data.image;
    }
    else {
        const receiver = data.participants.find((p) => p.userId != userId);
        name = receiver === null || receiver === void 0 ? void 0 : receiver.user.name;
        image = receiver === null || receiver === void 0 ? void 0 : receiver.user.avatar;
        isOnline = (_a = receiver === null || receiver === void 0 ? void 0 : receiver.user.isOnline) !== null && _a !== void 0 ? _a : false;
        receiverId = receiver === null || receiver === void 0 ? void 0 : receiver.userId;
    }
    return Object.assign({ id: data.id, name, image: (0, functions_1.getFileUrl)(image), type: data.type, isOnline,
        receiverId, unreadCount: data._count.messages }, (data.messages.length > 0
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
        senderAvatar: (0, functions_1.getFileUrl)(data.user.avatar),
    };
}
