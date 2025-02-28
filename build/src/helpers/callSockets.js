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
exports.CallService = void 0;
const prisma_1 = require("./prisma");
class CallService {
    constructor(io) {
        this.io = io;
    }
    setupSignaling(socket) {
        socket.on("initiate_call", (data) => this.handleInitiateCall(socket, data));
        socket.on("offer", (data) => this.handleOffer(socket, data));
        socket.on("answer", (data) => this.handleAnswer(socket, data));
        socket.on("ice-candidate", (data) => this.handleIceCandidate(socket, data));
        socket.on("end_call", (data) => this.handleEndCall(socket, data));
    }
    handleInitiateCall(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { receiverId, callType, offer } = data;
            const receiver = yield prisma_1.prisma.user.findUnique({
                where: { id: receiverId },
            });
            if (!receiver || !receiver.socketId) {
                socket.emit("call_error", { message: "Receiver not available" });
                return;
            }
            const call = yield prisma_1.prisma.call.create({
                data: {
                    callerId: socket.data.userId,
                    receiverId,
                    conversationId: data.conversationId,
                    callType,
                },
            });
            yield prisma_1.prisma.message.create({
                data: {
                    text: "Call started",
                    userId: socket.data.userId,
                    conversationId: data.conversationId,
                    type: "INFO",
                },
            });
            this.io.to(receiver.socketId).emit("incoming_call", {
                from: socket.id,
                callType,
                offer,
                callId: call.id,
            });
            socket.emit("call_initiated", { callId: call.id });
        });
    }
    handleOffer(socket, data) {
        const { offer, to } = data;
        this.io.to(to).emit("offer", { offer, from: socket.id });
    }
    handleAnswer(socket, data) {
        const { answer, to } = data;
        this.io.to(to).emit("answer", { answer, from: socket.id });
    }
    handleIceCandidate(socket, data) {
        const { candidate, to } = data;
        this.io.to(to).emit("ice-candidate", { candidate, from: socket.id });
    }
    handleEndCall(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { callId } = data;
            yield prisma_1.prisma.call.update({
                where: { id: callId },
                data: { callStatus: "ENDED" },
            });
            const call = yield prisma_1.prisma.call.findUnique({
                where: { id: callId },
                include: { caller: true, receiver: true },
            });
            if (call) {
                yield prisma_1.prisma.message.create({
                    data: {
                        text: "Call ended",
                        userId: socket.data.userId,
                        conversationId: call.conversationId,
                        type: "INFO",
                    },
                });
                if (call.caller.socketId) {
                    this.io.to(call.caller.socketId).emit("call_ended", { callId });
                }
                if (call.receiver.socketId) {
                    this.io.to(call.receiver.socketId).emit("call_ended", { callId });
                }
            }
        });
    }
}
exports.CallService = CallService;
