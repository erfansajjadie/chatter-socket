"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
exports.ChatController = void 0;
const base_controller_1 = __importDefault(require("./base.controller"));
const routing_controllers_1 = require("routing-controllers");
const conversation_dto_1 = require("../entities/conversation.dto");
const client_1 = require("@prisma/client");
const prisma_1 = require("../helpers/prisma");
const mappers_1 = require("../helpers/mappers");
const storage_1 = require("../helpers/storage");
const socketService_1 = __importDefault(require("../helpers/socketService"));
let ChatController = class ChatController extends base_controller_1.default {
    createConversation(dto, file) {
        const _super = Object.create(null, {
            ok: { get: () => super.ok }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const { type, participants, name, description, isPublic } = dto;
            let image = null;
            if (file) {
                console.log("File received:", file);
                image = (0, storage_1.saveFile)(file, "conversation_images");
            }
            dto.userId = parseInt(dto.userId);
            if (type == client_1.ConversationType.PRIVATE) {
                const previousConversation = yield prisma_1.prisma.conversation.findFirst({
                    where: {
                        participants: {
                            some: {
                                userId: dto.userId,
                            },
                        },
                        AND: {
                            participants: {
                                some: {
                                    userId: participants[0],
                                },
                            },
                        },
                    },
                    include: {
                        _count: {
                            select: {
                                messages: {
                                    where: { userId: { not: dto.userId }, isSeen: false },
                                },
                            },
                        },
                        participants: { take: 2, include: { user: true } },
                        messages: {
                            orderBy: { id: "desc" },
                            take: 1,
                            include: { user: true },
                        },
                    },
                });
                if (previousConversation) {
                    return _super.ok.call(this, {
                        conversation: (0, mappers_1.conversationMapper)(previousConversation, dto.userId),
                    });
                }
            }
            // Create a new conversation
            const conversation = yield prisma_1.prisma.conversation.create({
                include: {
                    _count: {
                        select: Object.assign({ messages: {
                                where: { userId: { not: dto.userId }, isSeen: false },
                            } }, (type === client_1.ConversationType.CHANNEL
                            ? { participants: true }
                            : {})),
                    },
                    participants: {
                        take: type === client_1.ConversationType.CHANNEL ? 5 : 2,
                        include: { user: true },
                    },
                    messages: {
                        orderBy: { id: "desc" },
                        take: 1,
                        include: { user: true },
                    },
                },
                data: {
                    type,
                    image,
                    name,
                    description: description || null,
                    isPublic: type === client_1.ConversationType.CHANNEL ? isPublic == "true" : null,
                    lastMessageDate: new Date(),
                },
            });
            // Create participants for the conversation
            if (type === client_1.ConversationType.CHANNEL) {
                // For channels, add creator as owner
                yield prisma_1.prisma.participant.create({
                    data: {
                        userId: dto.userId,
                        conversationId: conversation.id,
                        role: "OWNER",
                    },
                });
                // Create welcome message for channel
                yield prisma_1.prisma.message.create({
                    data: {
                        text: `Channel "${name}" has been created`,
                        type: client_1.MessageType.INFO,
                        userId: dto.userId,
                        conversationId: conversation.id,
                    },
                });
            }
            else {
                // For regular conversations and groups
                yield prisma_1.prisma.participant.createMany({
                    data: [
                        {
                            userId: dto.userId,
                            conversationId: conversation.id,
                            role: type === client_1.ConversationType.GROUP ? "OWNER" : "MEMBER",
                        },
                        ...participants.map((p) => {
                            return {
                                userId: p,
                                conversationId: conversation.id,
                                role: client_1.ParticipantRole.MEMBER,
                            };
                        }),
                    ],
                });
            }
            return _super.ok.call(this, {
                conversation: (0, mappers_1.conversationMapper)(conversation, dto.userId),
            });
        });
    }
    getConversation(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversations = yield prisma_1.prisma.conversation.findMany({
                where: {
                    participants: { some: { userId } },
                },
                orderBy: { lastMessageDate: "desc" },
                include: {
                    _count: {
                        select: {
                            messages: { where: { userId: { not: userId }, isSeen: false } },
                            participants: true,
                        },
                    },
                    participants: {
                        take: 5, // Increased to handle channels with more participants
                        include: { user: true },
                    },
                    messages: { orderBy: { id: "desc" }, take: 1, include: { user: true } },
                },
            });
            // Filter conversations based on type
            const data = conversations.filter((c) => {
                if (c.type === client_1.ConversationType.CHANNEL ||
                    c.type === client_1.ConversationType.GROUP) {
                    return true;
                }
                // For private conversations, only include them if they have messages
                return c.messages.length > 0;
            });
            return {
                data: data.map((c) => (0, mappers_1.conversationMapper)(c, userId)),
            };
        });
    }
    getMessages(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fetch both messages and conversation in parallel
            const [messages, conversation] = yield Promise.all([
                prisma_1.prisma.message.findMany({
                    where: { conversationId: id },
                    include: { user: true },
                }),
                prisma_1.prisma.conversation.findUnique({
                    where: { id },
                    include: {
                        _count: {
                            select: {
                                messages: { where: { userId: { not: userId }, isSeen: false } },
                                participants: true,
                            },
                        },
                        participants: {
                            include: { user: true },
                        },
                        messages: {
                            orderBy: { id: "desc" },
                            take: 1,
                            include: { user: true },
                        },
                    },
                }),
            ]);
            // Only mark messages as seen if they weren't sent by the current user
            const messagesToMarkAsSeen = messages
                .filter((m) => m.userId !== userId && !m.isSeen)
                .map((m) => m.id);
            // Update messages as seen if there are any to update
            if (messagesToMarkAsSeen.length > 0) {
                yield prisma_1.prisma.message.updateMany({
                    where: { id: { in: messagesToMarkAsSeen } },
                    data: { isSeen: true },
                });
            }
            return {
                data: (0, mappers_1.mapper)(messages, mappers_1.messageMapper),
                conversation: conversation
                    ? (0, mappers_1.conversationMapper)(conversation, userId)
                    : null,
            };
        });
    }
    getConversationParticipants(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const participants = yield prisma_1.prisma.participant.findMany({
                where: {
                    conversationId: id,
                },
                include: { user: true },
            });
            return {
                data: participants.map((p) => (Object.assign(Object.assign({}, p), { user: (0, mappers_1.userMapper)(p.user) }))),
            };
        });
    }
    removeParticipant(conversationId_1, _a) {
        const _super = Object.create(null, {
            error: { get: () => super.error },
            ok: { get: () => super.ok }
        });
        return __awaiter(this, arguments, void 0, function* (conversationId, { userId, targetUserId }) {
            // Check if the requesting user has permission
            const requester = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId,
                    conversationId,
                },
                include: { conversation: true },
            });
            if (!requester) {
                return _super.error.call(this, "You are not a participant of this conversation");
            }
            // Verify this is a channel or group
            if (requester.conversation.type !== client_1.ConversationType.CHANNEL &&
                requester.conversation.type !== client_1.ConversationType.GROUP) {
                return _super.error.call(this, "This conversation does not support participant management");
            }
            // Only owners and admins can remove participants
            if (!["OWNER", "ADMIN"].includes(requester.role)) {
                return _super.error.call(this, "You don't have permission to remove participants");
            }
            // Get target participant
            const targetParticipant = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId: targetUserId,
                    conversationId,
                },
                include: { user: true },
            });
            if (!targetParticipant) {
                return _super.error.call(this, "Target user is not a member of this conversation");
            }
            // Cannot remove the owner
            if (targetParticipant.role === "OWNER") {
                return _super.error.call(this, "The conversation owner cannot be removed");
            }
            // Admin cannot remove another admin
            if (requester.role === "ADMIN" && targetParticipant.role === "ADMIN") {
                return _super.error.call(this, "Admins cannot remove other admins");
            }
            // Add system message that user was removed
            const message = yield prisma_1.prisma.message.create({
                data: {
                    text: `${targetParticipant.user.name} was removed from the conversation`,
                    type: client_1.MessageType.INFO,
                    userId,
                    conversationId,
                },
                include: { user: true },
            });
            // Emit message via socket service
            socketService_1.default.emitToConversation(conversationId, "receiveMessage", {
                message: (0, mappers_1.messageMapper)(message),
            });
            // Remove participant
            yield prisma_1.prisma.participant.delete({
                where: { id: targetParticipant.id },
            });
            // Update last message date
            yield prisma_1.prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageDate: new Date() },
            });
            return _super.ok.call(this, {
                success: true,
                removedParticipant: Object.assign(Object.assign({}, targetParticipant), { user: (0, mappers_1.userMapper)(targetParticipant.user) }),
            });
        });
    }
    addParticipant(conversationId_1, _a) {
        const _super = Object.create(null, {
            error: { get: () => super.error },
            ok: { get: () => super.ok }
        });
        return __awaiter(this, arguments, void 0, function* (conversationId, { userId, targetUserId, role = "MEMBER", }) {
            // Check if the requesting user has permission
            const requester = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId,
                    conversationId,
                },
                include: { conversation: true },
            });
            if (!requester) {
                return _super.error.call(this, "You are not a participant of this conversation");
            }
            // For channels and groups, only owners and admins can add participants
            if ((requester.conversation.type === client_1.ConversationType.CHANNEL ||
                requester.conversation.type === client_1.ConversationType.GROUP) &&
                !["OWNER", "ADMIN"].includes(requester.role)) {
                return _super.error.call(this, "You don't have permission to add participants");
            }
            // Check if target user is already a participant
            const existingParticipant = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId: targetUserId,
                    conversationId,
                },
            });
            if (existingParticipant) {
                return _super.error.call(this, "User is already a participant of this conversation");
            }
            // Get target user details
            const targetUser = yield prisma_1.prisma.user.findUnique({
                where: { id: targetUserId },
            });
            if (!targetUser) {
                return _super.error.call(this, "Target user not found");
            }
            // Add participant with the specified role
            const participant = yield prisma_1.prisma.participant.create({
                data: {
                    userId: targetUserId,
                    conversationId,
                    role,
                },
                include: { user: true },
            });
            // Add system message that user was added
            const message = yield prisma_1.prisma.message.create({
                data: {
                    text: `${targetUser.name} was added to the conversation`,
                    type: client_1.MessageType.INFO,
                    userId,
                    conversationId,
                },
                include: { user: true },
            });
            // Emit message via socket service
            socketService_1.default.emitToConversation(conversationId, "receiveMessage", {
                message: (0, mappers_1.messageMapper)(message),
            });
            return _super.ok.call(this, {
                success: true,
                participant: Object.assign(Object.assign({}, participant), { user: (0, mappers_1.userMapper)(participant.user) }),
            });
        });
    }
    getContacts() {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield prisma_1.prisma.user.findMany();
            return { data: (0, mappers_1.mapper)(users, mappers_1.userMapper) };
        });
    }
    joinChannel(channelId_1, _a) {
        const _super = Object.create(null, {
            error: { get: () => super.error },
            ok: { get: () => super.ok }
        });
        return __awaiter(this, arguments, void 0, function* (channelId, { userId }) {
            // Check if user is already a participant
            const existingParticipant = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId,
                    conversationId: channelId,
                },
            });
            if (existingParticipant) {
                return _super.error.call(this, "User is already a member of this channel");
            }
            // Get channel details
            const channel = yield prisma_1.prisma.conversation.findUnique({
                where: { id: channelId },
                include: { participants: true },
            });
            if (!channel) {
                return _super.error.call(this, "Channel not found");
            }
            if (channel.type !== client_1.ConversationType.CHANNEL) {
                return _super.error.call(this, "This conversation is not a channel");
            }
            if (!channel.isPublic) {
                return _super.error.call(this, "This channel is private, invitation is required");
            }
            // Add user as participant with MEMBER role
            const participant = yield prisma_1.prisma.participant.create({
                data: {
                    userId,
                    conversationId: channelId,
                    role: "MEMBER",
                },
                include: { user: true },
            });
            // Add system message that user joined
            yield prisma_1.prisma.message.create({
                data: {
                    text: `User ${participant.user.name} joined the channel`,
                    type: client_1.MessageType.INFO,
                    userId,
                    conversationId: channelId,
                },
            });
            return _super.ok.call(this, {
                success: true,
                participant,
            });
        });
    }
    leaveChannel(conversationId_1, _a) {
        const _super = Object.create(null, {
            error: { get: () => super.error },
            ok: { get: () => super.ok }
        });
        return __awaiter(this, arguments, void 0, function* (conversationId, { userId }) {
            const participant = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId,
                    conversationId,
                },
                include: { user: true },
            });
            if (!participant) {
                return _super.error.call(this, "User is not a member of this channel");
            }
            // Check if user is the owner
            if (participant.role === "OWNER") {
                return _super.error.call(this, "Cannot leave channel: you are the owner and there are no admins to take over");
            }
            // Add system message that user left
            const message = yield prisma_1.prisma.message.create({
                data: {
                    text: `${participant.user.name} left the channel`,
                    type: client_1.MessageType.INFO,
                    userId,
                    conversationId: conversationId,
                },
                include: { user: true },
            });
            // Emit message via socket service
            socketService_1.default.emitToConversation(conversationId, "receiveMessage", {
                message: (0, mappers_1.messageMapper)(message),
            });
            // Remove participant
            yield prisma_1.prisma.participant.delete({
                where: { id: participant.id },
            });
            // Update last message date
            yield prisma_1.prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageDate: new Date() },
            });
            return _super.ok.call(this, {
                success: true,
            });
        });
    }
    updateParticipantRole(channelId_1, _a) {
        const _super = Object.create(null, {
            error: { get: () => super.error },
            ok: { get: () => super.ok }
        });
        return __awaiter(this, arguments, void 0, function* (channelId, { userId, targetUserId, newRole, }) {
            // Check if the requesting user has permission
            const requester = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId,
                    conversationId: channelId,
                },
            });
            if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
                return _super.error.call(this, "You don't have permission to change roles");
            }
            // Get target participant
            const target = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId: targetUserId,
                    conversationId: channelId,
                },
                include: { user: true },
            });
            if (!target) {
                return _super.error.call(this, "Target user is not a member of this channel");
            }
            // Only owner can promote to admin or modify admin roles
            if ((newRole === "ADMIN" || target.role === "ADMIN") &&
                requester.role !== "OWNER") {
                return _super.error.call(this, "Only the owner can promote to admin or modify admin roles");
            }
            // Update role
            const updatedParticipant = yield prisma_1.prisma.participant.update({
                where: { id: target.id },
                data: { role: newRole },
                include: { user: true },
            });
            // Add system message about role change
            yield prisma_1.prisma.message.create({
                data: {
                    text: `${target.user.name}'s role changed to ${newRole}`,
                    type: client_1.MessageType.INFO,
                    userId,
                    conversationId: channelId,
                },
            });
            return _super.ok.call(this, {
                participant: Object.assign(Object.assign({}, updatedParticipant), { user: (0, mappers_1.userMapper)(updatedParticipant.user) }),
            });
        });
    }
    deleteConversation(conversationId_1, _a) {
        const _super = Object.create(null, {
            error: { get: () => super.error },
            ok: { get: () => super.ok }
        });
        return __awaiter(this, arguments, void 0, function* (conversationId, { userId }) {
            // Check if the requesting user is the owner of the conversation
            const participant = yield prisma_1.prisma.participant.findFirst({
                where: {
                    userId,
                    conversationId,
                    role: "OWNER",
                },
                include: { conversation: true },
            });
            if (!participant) {
                return _super.error.call(this, "Only the owner can delete this conversation");
            }
            // Verify this is a channel or group
            if (participant.conversation.type !== client_1.ConversationType.CHANNEL &&
                participant.conversation.type !== client_1.ConversationType.GROUP) {
                return _super.error.call(this, "Only channels and groups can be deleted");
            }
            // Create a system message about the conversation being deleted
            const message = yield prisma_1.prisma.message.create({
                data: {
                    text: `This ${participant.conversation.type.toLowerCase()} is being deleted`,
                    type: client_1.MessageType.INFO,
                    userId,
                    conversationId,
                },
                include: { user: true },
            });
            // Emit message via socket service
            socketService_1.default.emitToConversation(conversationId, "receiveMessage", {
                message: (0, mappers_1.messageMapper)(message),
                isDeleting: true,
            });
            // Delete the conversation (this will cascade delete messages and participants)
            yield prisma_1.prisma.conversation.delete({
                where: { id: conversationId },
            });
            return _super.ok.call(this, {
                success: true,
                deletedConversationId: conversationId,
            });
        });
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, routing_controllers_1.Post)("/create/conversation"),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.UploadedFile)("file")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [conversation_dto_1.ConversationDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createConversation", null);
__decorate([
    (0, routing_controllers_1.Get)("/conversations/:userId"),
    __param(0, (0, routing_controllers_1.Param)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversation", null);
__decorate([
    (0, routing_controllers_1.Get)("/conversation/:id/messages"),
    __param(0, (0, routing_controllers_1.Param)("id")),
    __param(1, (0, routing_controllers_1.QueryParam)("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, routing_controllers_1.Get)("/conversation/:id/get-participants"),
    __param(0, (0, routing_controllers_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversationParticipants", null);
__decorate([
    (0, routing_controllers_1.Delete)("/conversation/:conversationId/remove-participant"),
    __param(0, (0, routing_controllers_1.Param)("conversationId")),
    __param(1, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "removeParticipant", null);
__decorate([
    (0, routing_controllers_1.Post)("/conversation/:conversationId/add-participant"),
    __param(0, (0, routing_controllers_1.Param)("conversationId")),
    __param(1, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addParticipant", null);
__decorate([
    (0, routing_controllers_1.Post)("/contacts"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getContacts", null);
__decorate([
    (0, routing_controllers_1.Post)("/join/channel/:channelId"),
    __param(0, (0, routing_controllers_1.Param)("channelId")),
    __param(1, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "joinChannel", null);
__decorate([
    (0, routing_controllers_1.Delete)("/leave/conversation/:conversationId"),
    __param(0, (0, routing_controllers_1.Param)("conversationId")),
    __param(1, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "leaveChannel", null);
__decorate([
    (0, routing_controllers_1.Put)("/channel/:channelId/participant-role"),
    __param(0, (0, routing_controllers_1.Param)("channelId")),
    __param(1, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateParticipantRole", null);
__decorate([
    (0, routing_controllers_1.Delete)("/delete/conversation/:conversationId"),
    __param(0, (0, routing_controllers_1.Param)("conversationId")),
    __param(1, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteConversation", null);
exports.ChatController = ChatController = __decorate([
    (0, routing_controllers_1.JsonController)()
], ChatController);
