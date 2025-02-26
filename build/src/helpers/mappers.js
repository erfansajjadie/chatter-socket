"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageMapper = exports.conversationMapper = exports.userMapper = exports.mapper = void 0;
const client_1 = require("@prisma/client");
const functions_1 = require("./functions");
function mapper(list, mappingFunction) {
    return list.map(mappingFunction);
}
exports.mapper = mapper;
function userMapper(user) {
    return {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        avatar: (0, functions_1.getFileUrl)(user.avatar),
    };
}
exports.userMapper = userMapper;
function conversationMapper(data, userId) {
    let name;
    let image;
    if (data.type == client_1.ConversationType.GROUP) {
        name = data.name;
        image = data.image;
    }
    else {
        const receiver = data.participants.find((p) => p.userId != userId);
        name = receiver === null || receiver === void 0 ? void 0 : receiver.user.name;
        image = receiver === null || receiver === void 0 ? void 0 : receiver.user.avatar;
    }
    return Object.assign({ id: data.id, name, image: (0, functions_1.getFileUrl)(image), type: data.type, unreadCount: data._count.messages }, (data.messages.length > 0
        ? { lastMessage: messageMapper(data.messages[0]) }
        : null));
}
exports.conversationMapper = conversationMapper;
function messageMapper(data) {
    return {
        id: data.id,
        text: data.text,
        date: (0, functions_1.getTimeFormat)(data.createdAt),
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
exports.messageMapper = messageMapper;
