import express from 'express';
import cors from 'cors';
import pkg from 'body-parser';
import homeRouter from './src/routes/homeRouter.js';
import sampleRouters from './src/routes/sampleRoutes.js';
import authRouters from './src/routes/authRoutes.js';
import { internetFileRouter, setupFileWebSocket } from './src/routes/internetFileRouter.js';
import roomsRouter from './src/routes/roomsRouter.js';
import profileRouter from './src/routes/ProfileRoutes.js';
import fileUpload from 'express-fileupload';
import http from 'http';
import { Server } from 'socket.io';
import chatRouter from './src/routes/chatRouter.js';

// express
const app = express();
app.use(cors());

// Middleware: parse request body to json format
const { json } = pkg;
app.use(json());

// Middleware：log request message
app.use((req, res, next) => {
    console.log(`\n${req.method} ${req.url}`);
    next();
});

// Middleware：file upload
app.use(fileUpload());

// use routes
app.use('/api/v1', homeRouter);
app.use('/api/v1', sampleRouters);
app.use('/api/v1', authRouters);
app.use('/api/v1', internetFileRouter);
app.use('/api/v1', roomsRouter);
app.use('/api/v1', profileRouter);

// websocket
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

// use routes
const fileNamespace = io.of('/file');
setupFileWebSocket(fileNamespace);

const chatNameSpace = io.of('/chat');
chatRouter(chatNameSpace);

// run server
const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
