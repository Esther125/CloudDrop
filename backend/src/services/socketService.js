class SocketService {
    systemMessage = (socket, stage, status, content = null) => {
        // 回傳處理結果通知給 client 用
        const userID = socket.handshake.auth?.user?.id || null;
        const res = {
            event: 'system message',
            message: {
                stage,
                status,
                content,
            },
            timestamp: new Date().toISOString(),
        };
        socket.emit('system message', res);

        if (userID) {
            console.log(`[socketService] send system message "${stage}: ${status}" to user ${userID}`);
        } else {
            console.log(`[socketService] send system message "${stage}: ${status}" to user with missing userID`);
        }
    };

    eventWithMissingValues = (socket, stage, requiredValues) => {
        const userID = socket.handshake.auth?.user?.id || null;
        console.log(`[socketService] user ${userID} ask to ${stage} with missing values`);

        const missingValues = Object.entries(requiredValues)
            .filter(([key, value]) => value === null)
            .map(([key, value]) => key);
        const msg = `${missingValues.join(', ')} required`;
        this.systemMessage(socket, stage, 'fail', msg);
    };

    connect = (socket, userID) => {
        console.log(`[socketService] user ${userID} ask to connect to /socket websocket server`);

        // 加入以 userID 命名的聊天室
        socket.join(userID);

        // 回傳處理結果通知
        this.systemMessage(socket, 'connect', 'success', 'success');
        console.log(`[socketService] user ${userID} connect to /socket websocket server`);
    };

    _checkUserInRoom = (socket, userID, roomToken) => {
        let memberSockets;
        let userSocket;
        try {
            memberSockets = [...socket.adapter.rooms.get(roomToken)];
            userSocket = [...socket.adapter.rooms.get(userID)][0];
        } catch {
            return false;
        }

        if (!memberSockets.includes(userSocket)) {
            return false;
        }
        return true;
    };

    _sendRoomNotify = (socket, roomToken, userID, type) => {
        const res = {
            event: 'room notify',
            roomToken,
            userID,
            type,
            timestamp: new Date().toISOString(),
        };
        socket.to(roomToken).emit('room notify', res);
    };

    joinChatroom = (socket, roomToken) => {
        const userID = socket.handshake.auth.user.id;
        console.log(`[socketService] user ${userID} ask to join chatroom ${roomToken}`);

        const roomExist = true; // TODO: 之後再看怎麼接 roomService 來判斷

        if (roomExist) {
            // 加入聊天室
            socket.join(roomToken);

            // 通知 room 內其他人
            this._sendRoomNotify(socket, roomToken, userID, 'join');

            // 回傳處理結果通知
            this.systemMessage(socket, 'join chatroom', 'success', 'success');
            console.log(`[socketService] user ${userID} join chatroom ${roomToken}`);
        } else {
            // 回傳處理結果通知
            this.systemMessage(socket, 'join chatroom', 'fail');
            console.log(`[socketService] user ${userID} can not join non existed room ${roomToken}`);
        }
    };

    requestTransfer = (socket, fileId, roomToken, receiverID, socketNameSpace) => {
        const userID = socket.handshake.auth.user.id;
        const senderID = userID;
        const res = {
            event: 'transfer notify',
            fileId: fileId,
            roomToken,
            senderID,
            timestamp: new Date().toISOString(),
        };

        // 檢查 sender 是否在該 chatroom 內
        const senderInRoom = this._checkUserInRoom(socket, senderID, roomToken);
        if (!senderInRoom) {
            this.systemMessage(socket, 'request transfer', 'fail', `sender not in room ${roomToken}`);
            console.log(`[socketService] sender ${userID} is not in room ${roomToken}`);
            return;
        }

        if (receiverID) {
            // 傳輸對象: user
            console.log(`[socketService] user ${userID} ask to transfer file to user ${receiverID}`);

            // 檢查 receiver 是否在該 chatroom 內
            const receiverInRoom = this._checkUserInRoom(socket, receiverID, roomToken);
            if (!receiverInRoom) {
                this.systemMessage(socket, 'request transfer', 'fail', `receiver not in room ${roomToken}`);
                console.log(`[socketService] receiver ${userID} is not in room ${roomToken}`);
                return;
            }

            // 檢查 sender、receiver 是否相同
            if (senderID === receiverID) {
                this.systemMessage(socket, 'request transfer', 'fail', `sender and receiver are the same`);
                console.log(`[socketService] user ${userID} ask to transfer to himself`);
                return;
            }

            // 通知 receiver，sender 要傳檔案給他
            socketNameSpace.to(receiverID).emit('transfer notify', res);
            console.log(
                `[socketService] send transfer notification requested from user ${senderID} to user ${receiverID}`
            );
        } else {
            // 傳輸對象: room
            console.log(`[socketService] user ${userID} ask to transfer file to room ${roomToken}`);

            // 通知 chatroom 中的所有 user，sender 要傳檔案給他
            socket.to(roomToken).emit('transfer notify', res);
            console.log(
                `[socketService] send transfer notification requested from user ${senderID} to room ${roomToken}`
            );
        }

        // 回傳處理結果通知
        this.systemMessage(socket, 'request transfer', 'success', 'success');
    };

    chatMessage = (socket, roomToken, message) => {
        const userID = socket.handshake.auth.user.id;
        console.log(`[socketService] user ${userID} ask to send message to chatroom ${roomToken}`);

        // 檢查該 user 是否在該 chatroom 內
        const inRoom = this._checkUserInRoom(socket, userID, roomToken);
        if (!inRoom) {
            this.systemMessage(socket, 'chat message', 'fail', `sender not in room ${roomToken}`);
            console.log(`[socketService] user ${userID} is not in room ${roomToken}`);
            return;
        }

        // 將訊息發給 chatroom 中的所有 user
        const res = {
            event: 'chat message',
            roomToken,
            message: {
                senderID: userID,
                content: message,
            },
            timestamp: new Date().toISOString(),
        };
        socket.to(roomToken).emit('chat message', res);

        // 回傳處理結果通知
        this.systemMessage(socket, 'chat message', 'success', 'success');
        console.log(`[socketService] user ${userID} send message ${message} to chatroom ${roomToken}`);
    };

    leaveChatroom = (socket, roomToken) => {
        const userID = socket.handshake.auth.user.id;
        console.log(`[socketService] user ${userID} ask to leave chatroom ${roomToken}`);

        // 檢查該 user 是否在該 chatroom 內
        const inRoom = this._checkUserInRoom(socket, userID, roomToken);
        if (!inRoom) {
            this.systemMessage(socket, 'leave chatroom', 'fail', `user not in room ${roomToken}`);
            console.log(`[socketService] user ${userID} is not in room ${roomToken}`);
            return;
        }

        // 離開聊天室
        socket.leave(roomToken);

        // 通知 room 內其他人
        this._sendRoomNotify(socket, roomToken, userID, 'leave');

        // 回傳處理結果通知
        this.systemMessage(socket, 'leave chatroom', 'success', 'success');
        console.log(`[socketService] user ${userID} leave chatroom ${roomToken}`);
    };

    disconnect = (socket, reason) => {
        const userID = socket.handshake.auth?.user?.id || null;
        if (userID) {
            console.log(`[socketService] user ${userID} disconnect with /socket websocket server because of ${reason}`);
        } else {
            console.log(
                `[socketService] user with missing userID disconnect with /socket websocket server because of ${reason}`
            );
        }
    };
}

export default SocketService;
