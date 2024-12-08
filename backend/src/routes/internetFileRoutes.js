import { Router } from 'express';
import InternetFileController from '../controllers/internetFileController.js';
import InternetFileService from '../services/internetFileService.js';
import multer from 'multer';

const internetFileRouter = Router();
const internetFileController = new InternetFileController();
const internetFileService = new InternetFileService();
const multerErrorHandling = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer Error:', err);
        return res.status(400).json({ message: 'Multer error: ' + err.message });
    } else if (err) {
        console.error('Unknown Error:', err);
        return res.status(500).json({ message: 'Unknown error during file upload' });
    }
    next();
};

// 定義路由
internetFileRouter.post(
    '/upload',
    internetFileService.getUploadMiddleware(),
    internetFileController.upload,
    multerErrorHandling
);
internetFileRouter.get('/:userId/download/:way/:fileId', internetFileController.download);
internetFileRouter.delete('/delete/:fileId', internetFileController.deleteFile);

export default internetFileRouter;
