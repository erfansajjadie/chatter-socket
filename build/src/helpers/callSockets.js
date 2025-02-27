"use strict";
// import { Server, Socket } from "socket.io";
// import { prisma } from "./prisma";
// export class CallService {
//   private io: Server;
//   constructor(io: Server) {
//     this.io = io;
//   }
//   /**
//    * Registers all WebRTC signaling events for a connected client.
//    */
//   setupSignaling(socket: Socket) {
//     // Handle initiating a call
//     socket.on("initiate_call", (data) => this.handleInitiateCall(socket, data));
//     // Handle WebRTC offer from the caller
//     socket.on("offer", (data) => this.handleOffer(socket, data));
//     // Handle WebRTC answer from the receiver
//     socket.on("answer", (data) => this.handleAnswer(socket, data));
//     // Handle ICE candidate exchange between peers
//     socket.on("ice-candidate", (data) => this.handleIceCandidate(socket, data));
//     // Handle call rejection
//     socket.on("reject_call", (data) => this.handleRejectCall(socket, data));
//     // Handle user call ending
//     socket.on("user_end_call", (data) => this.handleUserEndCall(socket, data));
//     // Handle admin call ending
//     socket.on("admin_end_call", (data) =>
//       this.handleAdminEndCall(socket, data),
//     );
//     // Handle admin call paused
//     socket.on("pause_call", (data) => this.handlePauseCall(socket, data));
//     // Handle admin call paused
//     socket.on("resume_call", (data) => this.handleResumeCall(socket, data));
//     // Handle not answer
//     socket.on("not_answered", (data) => this.handleNotAnswer(socket, data));
//     // Handle muted
//     socket.on("mute", (data) => this.handleMute(socket, data));
//     // Handle unmuted
//     socket.on("unmute", (data) => this.handleUnmute(socket, data));
//   }
//   /**
//    * Handles initiating a call by notifying the receiver.
//    */
//   private async handleInitiateCall(socket: Socket, data: any) {
//     const { to, from, callType, offer, userName, userEmail } = data;
//     const userIpHeader = socket?.handshake.headers["x-forwarded-for"];
//     const userIp = Array.isArray(userIpHeader)
//       ? userIpHeader[0]
//       : userIpHeader || "";
//     // Create a new chat record with the CONNECTED state
//     const chat = await prisma.chat.create({
//       data: {
//         senderEmail: userEmail,
//         senderName: userName,
//         receiverId: to,
//         type: callType,
//         state: ChatState.CONNECTED,
//         userSocket: from,
//         offer: offer,
//         userIp: userIp,
//       },
//     });
//     // Notify the receiver of the incoming call
//     this.io.to(to).emit("incoming_call", {
//       from,
//       callType,
//       offer,
//       userName,
//       userEmail,
//       chatId: chat.id,
//     });
//     this.io.to(from).emit("call_created", { chatId: chat.id });
//     console.log(`Initiating ${callType} call from ${from} to ${to}`);
//   }
//   /**
//    * Handles relaying WebRTC offer from caller to receiver.
//    */
//   private handleOffer(
//     socket: Socket,
//     data: { offer: RTCSessionDescriptionInit; to: string },
//   ) {
//     const { offer, to } = data;
//     // Relay the offer to the specified receiver
//     this.io.to(to).emit("offer", { offer, from: socket.id });
//     console.log(`Offer sent from ${socket.id} to ${to}`);
//   }
//   /**
//    * Handles relaying WebRTC answer from receiver to caller.
//    */
//   private handleAnswer(
//     socket: Socket,
//     data: { answer: RTCSessionDescriptionInit; to: string },
//   ) {
//     const { answer, to } = data;
//     // Relay the answer back to the caller
//     this.io.to(to).emit("answer", { answer, from: socket.id });
//     console.log(`Answer sent from ${socket.id} to ${to}`);
//   }
//   /**
//    * Handles ICE candidate exchange between peers.
//    */
//   private handleIceCandidate(
//     socket: Socket,
//     data: { candidate: RTCIceCandidateInit; to: string },
//   ) {
//     const { candidate, to } = data;
//     // Relay the ICE candidate to the specified peer
//     this.io.to(to).emit("ice-candidate", { candidate, from: socket.id });
//     console.log(`ICE candidate sent from ${socket.id} to ${to}`);
//   }
//   /**
//    * Handles call rejection and notifies the caller.
//    */
//   private async handleRejectCall(socket: Socket, data: { to: string }) {
//     const { to } = data;
//     // Update the chat state to REJECTED
//     await prisma.chat.updateMany({
//       where: { userSocket: to },
//       data: { state: ChatState.REJECTED_BY_ADMIN },
//     });
//     // Notify the caller that the call was rejected
//     this.io.to(to).emit("call_rejected", { from: socket.id });
//     console.log(`Call from ${socket.id} to ${to} was rejected`);
//   }
//   /**
//    * Handles ending the call by notifying both participants.
//    */
//   private async handleUserEndCall(
//     socket: Socket,
//     data: { to: string; duration: number; chatId: number },
//   ) {
//     const { to, chatId } = data;
//     // Update the chat state to DISCONNECTED
//     await prisma.chat.update({
//       where: { id: chatId },
//       data: { state: ChatState.ANSWERED, callDuration: data.duration },
//     });
//     // Notify both participants that the call has ended
//     this.io.to(to).emit("call_ended", { from: socket.id });
//     this.io.to(socket.id).emit("call_ended", { from: socket.id });
//     console.log(`Call between ${socket.id} and ${to} ended`);
//   }
//   /**
//    * Handles ending the call by notifying both participants.
//    */
//   private async handleAdminEndCall(
//     socket: Socket,
//     data: { to: string; duration: number; chatId: number },
//   ) {
//     const { to, chatId } = data;
//     // Update the chat state to DISCONNECTED
//     await prisma.chat.update({
//       where: { id: chatId },
//       data: { state: ChatState.ANSWERED, callDuration: data.duration },
//     });
//     // Notify both participants that the call has ended
//     this.io.to(to).emit("call_ended", { from: socket.id });
//     this.io.to(socket.id).emit("call_ended", { from: to });
//     console.log(`Call between ${socket.id} and ${to} ended`);
//   }
//   /**
//    * Handles Not answering call after 10 seconds
//    */
//   private async handleNotAnswer(
//     socket: Socket,
//     data: { answer: RTCSessionDescriptionInit; to: string },
//   ) {
//     const { to } = data;
//     await prisma.chat.updateMany({
//       where: { userSocket: socket.id },
//       data: { state: ChatState.NOT_ANSWERED },
//     });
//     // Relay the answer back to the admin that the call is not active
//     this.io.to(to).emit("user_disconnected", { socketId: socket.id });
//   }
//   /**
//    * Handles pausing call by admin
//    */
//   private handlePauseCall(socket: Socket, data: { to: string }) {
//     const { to } = data;
//     // Relay the answer back to the caller
//     this.io.to(to).emit("call_paused");
//     console.log(`Call paused sent to: ${to}`);
//   }
//   /**
//    * Handles resuming call by admin
//    */
//   private handleResumeCall(socket: Socket, data: { to: string }) {
//     const { to } = data;
//     // Relay the answer back to the caller
//     this.io.to(to).emit("call_resumed");
//     console.log(`Call resumed sent to: ${to}`);
//   }
//   /**
//    * Handles muting call
//    */
//   private handleMute(socket: Socket, data: { to: string }) {
//     const { to } = data;
//     // Relay the answer back to the caller
//     this.io.to(to).emit("call_muted");
//     console.log(`Call muted sent to: ${to}`);
//   }
//   /**
//    * Handles unmuting call
//    */
//   private handleUnmute(socket: Socket, data: { to: string }) {
//     const { to } = data;
//     // Relay the answer back to the caller
//     this.io.to(to).emit("call_unmuted");
//     console.log(`Call  unmuted sent to: ${to}`);
//   }
// }
