"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Singleton service to provide access to the socket.io server instance
 * throughout the application
 */
class SocketService {
    constructor() {
        this.io = null;
    }
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    setIo(io) {
        this.io = io;
    }
    getIo() {
        return this.io;
    }
    emitToUser(userId, event, data) {
        if (!this.io) {
            console.error("Socket.io instance not initialized");
            return;
        }
        this.io.emit(`user_${userId}`, { event, data });
    }
    emitToConversation(conversationId, event, data) {
        if (!this.io) {
            console.error("Socket.io instance not initialized");
            return;
        }
        this.io.to(`conversation_${conversationId}`).emit(event, data);
    }
    emitGlobal(event, data) {
        if (!this.io) {
            console.error("Socket.io instance not initialized");
            return;
        }
        this.io.emit(event, data);
    }
}
exports.default = SocketService.getInstance();
