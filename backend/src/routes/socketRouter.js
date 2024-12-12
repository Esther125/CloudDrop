import SocketController from '../controllers/socketController.js';

const VALID_EVENTS = ['join chatroom', 'request transfer', 'chat message', 'leave chatroom'];

const socketRouter = (socketNameSpace) => {
    const socketController = new SocketController();

    // connect to server (/socket)
    socketNameSpace.on('connection', (socket) => {
        socketController.connect(socket);

        socket.on('join chatroom', (payload) => {
            // join chatroom
            socketController.joinChatroom(socket, payload);
        });

        socket.on('request transfer', (payload) => {
            // request transfer (file)
            socketController.requestTransfer(socket, payload, socketNameSpace);
        });

        socket.on('chat message', (payload) => {
            // chat message
            socketController.chatMessage(socket, payload);
        });

        socket.on('leave chatroom', (payload) => {
            // leave chatroom
            socketController.leaveChatroom(socket, payload);
        });

        socket.on('disconnect', (reason) => {
            // disconnect with server (/socket)
            socketController.disconnect(socket, reason);
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
            socketController.invalidEvent(socket);
        });
    });
};

export default socketRouter;
