import { Server, Socket } from "socket.io";
import { prisma } from "./prisma";

export class CallService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  setupSignaling(socket: Socket) {
    socket.on("initiate_call", (data) => this.handleInitiateCall(socket, data));
    socket.on("offer", (data) => this.handleOffer(socket, data));
    socket.on("answer", (data) => this.handleAnswer(socket, data));
    socket.on("ice-candidate", (data) => this.handleIceCandidate(socket, data));
    socket.on("end_call", (data) => this.handleEndCall(socket, data));
  }

  private async handleInitiateCall(socket: Socket, data: any) {
    const { receiverId, callType, offer } = data;

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver || !receiver.socketId) {
      socket.emit("call_error", { message: "Receiver not available" });
      return;
    }

    const call = await prisma.call.create({
      data: {
        callerId: socket.data.userId,
        receiverId,
        conversationId: data.conversationId,
        callType,
      },
    });

    await prisma.message.create({
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
  }

  private handleOffer(
    socket: Socket,
    data: { offer: RTCSessionDescriptionInit; to: string },
  ) {
    const { offer, to } = data;
    this.io.to(to).emit("offer", { offer, from: socket.id });
  }

  private handleAnswer(
    socket: Socket,
    data: { answer: RTCSessionDescriptionInit; to: string },
  ) {
    const { answer, to } = data;
    this.io.to(to).emit("answer", { answer, from: socket.id });
  }

  private handleIceCandidate(
    socket: Socket,
    data: { candidate: RTCIceCandidateInit; to: string },
  ) {
    const { candidate, to } = data;
    this.io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  }

  private async handleEndCall(socket: Socket, data: { callId: number }) {
    const { callId } = data;

    await prisma.call.update({
      where: { id: callId },
      data: { callStatus: "ENDED" },
    });

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { caller: true, receiver: true },
    });

    if (call) {
      await prisma.message.create({
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
  }
}
