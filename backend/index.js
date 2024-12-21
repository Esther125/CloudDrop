import express from 'express';
import cors from 'cors';
import pkg from 'body-parser';
import cookieParser from 'cookie-parser';
import homeRouter from './src/routes/homeRouter.js';
import authRouters from './src/routes/authRoutes.js';
import internetFileRouter from './src/routes/internetFileRoutes.js';
import roomsRouter from './src/routes/roomsRouter.js';
import profileRouter from './src/routes/ProfileRoutes.js';
import historyRouter from './src/routes/historyRoutes.js';
import { logWithFileInfo } from './logger.js';
import http from 'http';
import { Server } from 'socket.io';
import socketRouter from './src/routes/socketRouter.js';
import redisClient from './src/clients/redisClient.js';

// express
const app = express();
app.use(
    cors({
        origin: process.env.FRONTEND_BASE_URL,
        credentials: true,
        exposedHeaders: ['Content-Disposition'], // 顯式暴露 Content-Disposition 標頭
    })
);

// Middleware: parse request body to json format
const { json } = pkg;
app.use(json());

// Middleware：log request message
app.use((req, res, next) => {
    logWithFileInfo('info', `${req.method} ${req.url}`);
    next();
});

// Middleware: cookie parser
app.use(cookieParser());

// use routes
app.use('/api/v1', homeRouter);
app.use('/api/v1', authRouters);
app.use('/api/v1', internetFileRouter);
app.use('/api/v1', roomsRouter);
app.use('/api/v1', profileRouter);
app.use('/api/v1', historyRouter);

// websocket
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

// use routes
const socketNameSpace = io.of('/socket');
socketRouter(socketNameSpace);

// Quit Redis
process.on('SIGINT', async () => {
    logWithFileInfo('info', '[App] Shutting down...');
    try {
        await redisClient.quit();
    } catch (err) {
        logWithFileInfo('error', '[App] Error while quitting Redis', err);
    } finally {
        process.exit(0);
    }
});

// run server
const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
    logWithFileInfo('info', `Server is running on port ${PORT}`);
    // Error example log:
    // const exampleError = new Error('This is an example error log');
    // logWithFileInfo('error', 'An example error occurred', exampleError);
});
