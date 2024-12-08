import { Router } from 'express';
import InternetFileController from '../controllers/InternetFileController.js';

const internetFileRouter = Router();
const internetFileController = new InternetFileController();

// HTTP endpoint
internetFileRouter.post('/upload', internetFileController.upload);
internetFileRouter.post('/send', internetFileController.send); // 这里可能需要考虑是否通过WebSocket处理
internetFileRouter.get('/download/:way/:fileId', internetFileController.download);

// Web Socket
const VALID_FILE_EVENTS = ['request file send', 'request file receive', 'file transfer notify'];

const setupFileWebSocket = (fileNamespace) => {
    fileNamespace.on('connection', (socket) => {
        console.log('Connected to file transfer service');

        socket.on('request file send', (payload) => {
            internetFileController.send(socket, payload);
        });

        socket.on('request file receive', (payload) => {
            internetFileController.receive(socket, payload);
        });

        socket.on('file transfer notify', (payload) => {
            internetFileController.notifyFileTransfer(socket, payload);
        });

        socket.on('disconnect', (reason) => {
            console.log(`Disconnected from file transfer service: ${reason}`);
        });

        socket.on('error', (e) => {
            console.log(`Error in websocket for file transfer: ${e}`);
        });

        socket.onAny((event) => {
            if (!VALID_FILE_EVENTS.includes(event)) {
                console.log(`Invalid event: ${event}`);
            }
        });
    });
};

export { internetFileRouter, setupFileWebSocket };
