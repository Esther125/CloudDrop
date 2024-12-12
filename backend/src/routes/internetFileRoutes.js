import { Router } from 'express';
import InternetFileController from '../controllers/internetFileController.js';
import multer from 'multer';

const internetFileRouter = Router();
const internetFileController = new InternetFileController();

// 定義檔案上傳 middleware
const uploadWithMulter = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('uploadFile'); // 'uploadFile' 是前端 input 的 name 屬性

// 定義 middleware 的 error handling
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
    uploadWithMulter,
    (req, res) => internetFileController.upload(req, res),
    multerErrorHandling
);
internetFileRouter.get('/:userId/download/:way/:fileId', internetFileController.download);
internetFileRouter.delete('/delete/:fileId', internetFileController.deleteFile);

export default internetFileRouter;
