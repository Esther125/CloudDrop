import ChatController from '../controllers/chatController.js';

const VALID_EVENTS = ['join chatroom', 'request transfer', 'chat message', 'leave chatroom'];

const chatRouter = (chatNameSpace) => {
    const chatController = new ChatController();

    // connect to server (/chat)
    chatNameSpace.on('connection', (socket) => {
        chatController.connect(socket);

        socket.on('join chatroom', (payload) => {
            // join chatroom
            chatController.joinChatroom(socket, payload);
        });

        socket.on('request transfer', (payload) => {
            // request transfer (file)
            chatController.requestTransfer(socket, payload, chatNameSpace);
        });

        socket.on('chat message', (payload) => {
            // chat message
            chatController.chatMessage(socket, payload);
        });

        socket.on('leave chatroom', (payload) => {
            // leave chatroom
            chatController.leaveChatroom(socket, payload);
        });

        socket.on('disconnect', (reason) => {
            // disconnect with server (/chat)
            chatController.disconnect(socket, reason);
        });

        socket.on('error', (e) => {
            // error
            console.log(`Error in websocket for chat: ${e}`);
        });

        socket.onAny((event) => {
            // invalid events
            if (VALID_EVENTS.includes(event)) {
                return;
            }
            chatController.invalidEvent(socket);
        });
    });
};

export default chatRouter;
