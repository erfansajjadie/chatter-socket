import { Server, Socket } from "socket.io";
import { prisma } from "./prisma";

export class CallService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  setupSignaling(socket: Socket) {
    console.log(`Setting up signaling for socket: ${socket.id}`);
    socket.on("initiate_call", (data) => this.handleInitiateCall(socket, data));
    socket.on("offer", (data) => this.handleOffer(socket, data));
    socket.on("answer", (data) => this.handleAnswer(socket, data));
    socket.on("ice-candidate", (data) => this.handleIceCandidate(socket, data));
    socket.on("end_call", (data) => this.handleEndCall(socket, data));
  }

  private async handleInitiateCall(socket: Socket, data: any) {
    console.log(
      `Initiating call from socket: ${socket.id} with data: ${JSON.stringify(
        data,
      )}`,
    );
    const { receiverId, callerId, callType, offer, conversationId } = data;

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver || !receiver.socketId) {
      console.warn(`Receiver not available for socket: ${socket.id}`);
      socket.emit("call_error", { message: "Receiver not available" });
      return;
    }

    const call = await prisma.call.create({
      data: {
        callerId,
        receiverId,
        conversationId: conversationId,
        callType,
      },
    });

    await prisma.message.create({
      data: {
        text: "Call started",
        userId: callerId,
        conversationId: conversationId,
        type: "INFO",
      },
    });

    console.log(
      `Call initiated with ID: ${call.id} from socket: ${socket.id} to receiver socket: ${receiver.socketId}`,
    );
    this.io.to(receiver.socketId).emit("incoming_call", {
      from: socket.id,
      callType,
      offer,
      callId: call.id,
      receiverId,
    });

    socket.emit("call_initiated", { callId: call.id });
  }

  private handleOffer(
    socket: Socket,
    data: { offer: RTCSessionDescriptionInit; to: string },
  ) {
    console.log(`Handling offer from socket: ${socket.id} to: ${data.to}`);
    const { offer, to } = data;
    this.io.to(to).emit("offer", { offer, from: socket.id });
  }

  private handleAnswer(
    socket: Socket,
    data: { answer: RTCSessionDescriptionInit; to: string },
  ) {
    console.log(`Handling answer from socket: ${socket.id} to: ${data.to}`);
    const { answer, to } = data;
    this.io.to(to).emit("answer", { answer, from: socket.id });
  }

  private handleIceCandidate(
    socket: Socket,
    data: { candidate: RTCIceCandidateInit; to: string },
  ) {
    console.log(
      `Handling ICE candidate from socket: ${socket.id} to: ${data.to}`,
    );
    const { candidate, to } = data;
    this.io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  }

  private async handleEndCall(socket: Socket, data: { callId: number }) {
    console.log(
      `Ending call with ID: ${data.callId} from socket: ${socket.id}`,
    );
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

      console.log(
        `Call with ID: ${callId} ended. Notifying caller and receiver.`,
      );
      if (call.caller.socketId) {
        this.io.to(call.caller.socketId).emit("call_ended", { callId });
      }
      if (call.receiver.socketId) {
        this.io.to(call.receiver.socketId).emit("call_ended", { callId });
      }
    }
  }
}
