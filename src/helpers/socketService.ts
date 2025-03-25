import { Server } from "socket.io";

/**
 * Singleton service to provide access to the socket.io server instance
 * throughout the application
 */
class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public setIo(io: Server): void {
    this.io = io;
  }

  public getIo(): Server | null {
    return this.io;
  }

  public emitToUser(userId: number, event: string, data: any): void {
    if (!this.io) {
      console.error("Socket.io instance not initialized");
      return;
    }

    this.io.emit(`user_${userId}`, { event, data });
  }

  public emitToConversation(
    conversationId: number,
    event: string,
    data: any,
  ): void {
    if (!this.io) {
      console.error("Socket.io instance not initialized");
      return;
    }

    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }

  public emitGlobal(event: string, data: any): void {
    if (!this.io) {
      console.error("Socket.io instance not initialized");
      return;
    }

    this.io.emit(event, data);
  }
}

export default SocketService.getInstance();
