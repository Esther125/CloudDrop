import ChatService from '../services/chatService.js';

class ChatController {
    constructor() {
        this.chatService = new ChatService();
    }

    connect = (socket) => {
        // connect to server (/chat)
        console.log('[chatController] -----connect-----');

        try {
            const userID = socket.handshake.auth?.user?.id || null;
            if (userID === null) {
                this.chatService.eventWithMissingValues(socket, 'connect', { userID });
            } else {
                this.chatService.connect(socket, userID);
            }
        } catch {
            console.error(`[chatController] Error when connecting chat websocket`);
        }
    };

    joinChatroom = (socket, payload) => {
        console.log('[chatController] -----joinChatroom-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            if (roomToken === null) {
                this.chatService.eventWithMissingValues(socket, 'join chatroom', { roomToken });
            } else {
                this.chatService.joinChatroom(socket, roomToken);
            }
        } catch {
            console.error(`[chatController] Error when joining chatroom for ${userID}`);
            this.chatService.systemMessage(socket, 'join chatroom', 'error', 'error');
        }
    };

    requestTransfer = (socket, payload, chatNameSpace) => {
        console.log('[chatController] -----requestTransfer-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            const receiverID = payload?.receiverID || null;
            if (roomToken === null) {
                this.chatService.eventWithMissingValues(socket, 'request transfer', { roomToken });
            } else {
                this.chatService.requestTransfer(socket, roomToken, receiverID, chatNameSpace);
            }
        } catch {
            console.error(`[chatController] Error when user ${userID} request transfer`);
            this.chatService.systemMessage(socket, 'request transfer', 'error', 'error');
        }
    };

    chatMessage = (socket, payload) => {
        console.log('[chatController] -----chatMessage-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            const message = payload?.message || null;
            if (roomToken === null || message === null) {
                this.chatService.eventWithMissingValues(socket, 'chat message', { roomToken, message });
            } else {
                this.chatService.chatMessage(socket, roomToken, message);
            }
        } catch {
            console.error(`[chatController] Error when user ${userID} send chat message`);
            this.chatService.systemMessage(socket, 'chat message', 'error', 'error');
        }
    };

    leaveChatroom = (socket, payload) => {
        console.log('[chatController] -----leaveChatroom-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            if (roomToken === null) {
                this.chatService.eventWithMissingValues(socket, 'leave chatroom', { roomToken });
            } else {
                this.chatService.leaveChatroom(socket, roomToken);
            }
        } catch {
            console.error(`[chatController] Error when leaving chatroom for ${userID}`);
            this.chatService.systemMessage(socket, 'leave chatroom', 'error', 'error');
        }
    };

    disconnect = (socket, reason) => {
        console.log('[chatController] -----disconnect-----');
        this.chatService.disconnect(socket, reason);
    };

    invalidEvent = (socket) => {
        console.log('[chatController] -----invalid event-----');
        this.chatService.systemMessage(socket, 'invalid event', 'fail', 'invalid event');
    };
}

export default ChatController;
