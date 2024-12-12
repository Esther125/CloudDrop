import SocketService from '../services/socketService.js';

class SocketController {
    constructor() {
        this.socketService = new SocketService();
    }

    connect = (socket) => {
        // connect to server (/socket)
        console.log('[socketController] -----connect-----');

        try {
            const userID = socket.handshake.auth?.user?.id || null;
            if (userID === null) {
                this.socketService.eventWithMissingValues(socket, 'connect', { userID });
            } else {
                this.socketService.connect(socket, userID);
            }
        } catch {
            console.error(`[socketController] Error when connecting chat websocket`);
        }
    };

    joinChatroom = (socket, payload) => {
        console.log('[socketController] -----joinChatroom-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            if (roomToken === null) {
                this.socketService.eventWithMissingValues(socket, 'join chatroom', { roomToken });
            } else {
                this.socketService.joinChatroom(socket, roomToken);
            }
        } catch {
            console.error(`[socketController] Error when joining chatroom for ${userID}`);
            this.socketService.systemMessage(socket, 'join chatroom', 'error', 'error');
        }
    };

    requestTransfer = (socket, payload, socketNameSpace) => {
        console.log('[socketController] -----requestTransfer-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const fileId = payload?.fileId || null;
            const roomToken = payload?.roomToken || null;
            const receiverID = payload?.receiverID || null;
            if (roomToken === null) {
                this.socketService.eventWithMissingValues(socket, 'request transfer', { roomToken });
            } else {
                this.socketService.requestTransfer(socket, fileId, roomToken, receiverID, socketNameSpace);
            }
        } catch {
            console.error(`[socketController] Error when user ${userID} request transfer`);
            this.socketService.systemMessage(socket, 'request transfer', 'error', 'error');
        }
    };

    chatMessage = (socket, payload) => {
        console.log('[socketController] -----chatMessage-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            const message = payload?.message || null;
            if (roomToken === null || message === null) {
                this.socketService.eventWithMissingValues(socket, 'chat message', { roomToken, message });
            } else {
                this.socketService.chatMessage(socket, roomToken, message);
            }
        } catch {
            console.error(`[socketController] Error when user ${userID} send chat message`);
            this.socketService.systemMessage(socket, 'chat message', 'error', 'error');
        }
    };

    leaveChatroom = (socket, payload) => {
        console.log('[socketController] -----leaveChatroom-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            if (roomToken === null) {
                this.socketService.eventWithMissingValues(socket, 'leave chatroom', { roomToken });
            } else {
                this.socketService.leaveChatroom(socket, roomToken);
            }
        } catch {
            console.error(`[socketController] Error when leaving chatroom for ${userID}`);
            this.socketService.systemMessage(socket, 'leave chatroom', 'error', 'error');
        }
    };

    disconnect = (socket, reason) => {
        console.log('[socketController] -----disconnect-----');
        this.socketService.disconnect(socket, reason);
    };

    invalidEvent = (socket) => {
        console.log('[socketController] -----invalid event-----');
        this.socketService.systemMessage(socket, 'invalid event', 'fail', 'invalid event');
    };
}

export default SocketController;
