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
const storage_1 = require("../helpers/storage");
const mappers_1 = require("../helpers/mappers");
const contact_dto_1 = require("../entities/contact.dto");
let ChatController = exports.ChatController = class ChatController extends base_controller_1.default {
    createConversation(dto, file) {
        const _super = Object.create(null, {
            ok: { get: () => super.ok }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { type, participants, name } = dto;
            const image = (_a = file === null || file === void 0 ? void 0 : file.path) === null || _a === void 0 ? void 0 : _a.replace("public_html/", "");
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
                data: {
                    type,
                    image,
                    name,
                },
            });
            // Create participants for the conversation
            yield prisma_1.prisma.participant.createMany({
                data: [
                    {
                        userId: dto.userId,
                        conversationId: conversation.id,
                    },
                    ...participants.map((p) => {
                        return {
                            userId: p,
                            conversationId: conversation.id,
                        };
                    }),
                ],
            });
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
                        },
                    },
                    participants: { take: 2, include: { user: true } },
                    messages: { orderBy: { id: "desc" }, take: 1, include: { user: true } },
                },
            });
            const data = conversations.filter((c) => c.type == client_1.ConversationType.GROUP ? true : c.messages.length > 0);
            return {
                data: data.map((c) => (0, mappers_1.conversationMapper)(c, userId)),
            };
        });
    }
    getMessages(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const messages = yield prisma_1.prisma.message.findMany({
                where: { conversationId: id },
                include: { user: true },
            });
            const ids = messages.map((m) => m.id);
            // update private messages is seen
            yield prisma_1.prisma.message.updateMany({
                where: { id: { in: ids } },
                data: { isSeen: true },
            });
            return {
                data: (0, mappers_1.mapper)(messages, mappers_1.messageMapper),
            };
        });
    }
    getContacts(dto) {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield prisma_1.prisma.user.findMany({
                where: { mobile: { in: dto.mobiles } },
            });
            return { data: (0, mappers_1.mapper)(users, mappers_1.userMapper) };
        });
    }
};
__decorate([
    (0, routing_controllers_1.Post)("/create/conversation"),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.UploadedFile)("image", { options: (0, storage_1.uploadOptions)("group-images") })),
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, routing_controllers_1.Post)("/contacts"),
    __param(0, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [contact_dto_1.ContactDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getContacts", null);
exports.ChatController = ChatController = __decorate([
    (0, routing_controllers_1.JsonController)()
], ChatController);
