import InternetFileService from '../services/internetFileService.js';
import ChatService from '../services/chatService.js';
import path from 'path';

class InternetFileController {
    constructor() {
        this.internetFileService = new InternetFileService();
        this.chatService = new ChatService();
    }

    connect = (socket) => {
        // connect to server (/file)
        console.log('[InternetFileController] -----connect-----');

        try {
            const userID = socket.handshake.auth?.user?.id || null;
            if (userID === null) {
                this.chatService.eventWithMissingValues(socket, 'connect', { userID });
            } else {
                this.chatService.connect(socket, userID);
            }
        } catch {
            console.error(`[InternetFileController] Error when connecting chat websocket`);
        }
    };

    requestFileTransfer = (socket, payload, chatNameSpace) => {
        console.log('[InternetFileController] -----requestFileTransfer-----');
        const userID = socket.handshake.auth.user.id;

        try {
            const roomToken = payload?.roomToken || null;
            const receiverID = payload?.receiverID || null;
            if (roomToken === null) {
                this.chatService.eventWithMissingValues(socket, 'file transfer notify', { roomToken });
            } else {
                this.chatService.requestFileTransfer(socket, roomToken, receiverID, chatNameSpace);
            }
        } catch {
            console.error(`[InternetFileController] Error when user ${userID} request file transfer`);
            this.chatService.systemMessage(socket, 'file transfer notify', 'error', 'error');
        }
    };

    disconnect = (socket, reason) => {
        console.log('[InternetFileController] -----disconnect-----');
        this.chatService.disconnect(socket, reason);
    };

    invalidEvent = (socket) => {
        console.log('[InternetFileController] -----invalid event-----');
        this.chatService.systemMessage(socket, 'invalid event', 'fail', 'invalid event');
    };

    send = async (req, res) => {
        console.log('----InternetFileController.send');
        try {
            const receiverId = await this.internetFileService.send(req, res);
            res.status(200).json({ message: 'File sent successfully.', receiverId: receiverId });
        } catch (error) {
            console.log('Error sending file:', error);
            res.status(500).json({ message: 'Failed to send the file.', error: error.message });
        }
    };

    upload = async (req, res) => {
        console.log('----InternetFileController.upload');
        try {
            const filename = await this.internetFileService.upload(req, res);
            const fileId = path.basename(filename, path.extname(filename));
            res.status(200).json({ message: 'File uploaded successfully.', fileId: fileId });
        } catch (error) {
            console.error('Error uploading file: ', error);
            res.status(500).json({ message: 'Failed to upload the file.', error: error.message });
        }
    };

    download = async (req, res) => {
        console.log('----InternetFileController.download');
        try {
            await this.internetFileService.download(req, res);
            console.info('File donwloaded successfully.');
        } catch (error) {
            console.error('Error downloading file: ', error);
            res.status(500).json({ message: 'Failed to download the file.', error: error.message });
        }
    };
}

export default InternetFileController;
