import express from 'express';
import cors from 'cors';
import pkg from 'body-parser';
import homeRouter from './src/routes/homeRouter.js';
import sampleRouters from './src/routes/sampleRoutes.js';
import authRouters from './src/routes/authRoutes.js';
import internetFileRouter from './src/routes/internetFileRoutes.js';
import roomsRouter from './src/routes/roomsRouter.js';
import profileRouter from './src/routes/ProfileRoutes.js';

const app = express();
app.use(cors());

// Middleware: parse request body to json format
const { json } = pkg;
app.use(json());

// Middleware：log request message
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// use routes
app.use('/api/v1', homeRouter);
app.use('/api/v1', sampleRouters);
app.use('/api/v1', authRouters);
app.use('/api/v1', internetFileRouter);
app.use('/api/v1', roomsRouter);
app.use('/api/v1', profileRouter);

// run server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
