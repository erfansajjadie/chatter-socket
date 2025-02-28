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
        console.log(`Setting up signaling for socket: ${socket.id}`);
        socket.on("initiate_call", (data) => this.handleInitiateCall(socket, data));
        socket.on("offer", (data) => this.handleOffer(socket, data));
        socket.on("answer", (data) => this.handleAnswer(socket, data));
        socket.on("ice-candidate", (data) => this.handleIceCandidate(socket, data));
        socket.on("end_call", (data) => this.handleEndCall(socket, data));
    }
    handleInitiateCall(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Initiating call from socket: ${socket.id} with data: ${JSON.stringify(data)}`);
            const { receiverId, callerId, callType, offer, conversationId } = data;
            const receiver = yield prisma_1.prisma.user.findUnique({
                where: { id: receiverId },
            });
            if (!receiver || !receiver.socketId) {
                console.warn(`Receiver not available for socket: ${socket.id}`);
                socket.emit("call_error", { message: "Receiver not available" });
                return;
            }
            const call = yield prisma_1.prisma.call.create({
                data: {
                    callerId,
                    receiverId,
                    conversationId: conversationId,
                    callType,
                },
            });
            yield prisma_1.prisma.message.create({
                data: {
                    text: "Call started",
                    userId: callerId,
                    conversationId: conversationId,
                    type: "INFO",
                },
            });
            console.log(`Call initiated with ID: ${call.id} from socket: ${socket.id} to receiver socket: ${receiver.socketId}`);
            this.io.to(receiver.socketId).emit("incoming_call", {
                from: socket.id,
                callType,
                offer,
                callId: call.id,
                receiverId,
            });
            socket.emit("call_initiated", { callId: call.id });
        });
    }
    handleOffer(socket, data) {
        console.log(`Handling offer from socket: ${socket.id} to: ${data.to}`);
        const { offer, to } = data;
        this.io.to(to).emit("offer", { offer, from: socket.id });
    }
    handleAnswer(socket, data) {
        console.log(`Handling answer from socket: ${socket.id} to: ${data.to}`);
        const { answer, to } = data;
        this.io.to(to).emit("answer", { answer, from: socket.id });
    }
    handleIceCandidate(socket, data) {
        console.log(`Handling ICE candidate from socket: ${socket.id} to: ${data.to}`);
        const { candidate, to } = data;
        this.io.to(to).emit("ice-candidate", { candidate, from: socket.id });
    }
    handleEndCall(socket, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Ending call with ID: ${data.callId} from socket: ${socket.id}`);
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
                console.log(`Call with ID: ${callId} ended. Notifying caller and receiver.`);
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
