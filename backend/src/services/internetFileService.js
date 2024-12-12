import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import S3Service from './s3Service.js';
import redisClient from '../clients/redisClient.js';
import { logWithFileInfo } from '../../logger.js';

class InternetFileService {
    constructor() {
        this.redisClient = new redisClient();
        this.redisClient.connect();
        this.__filename = fileURLToPath(import.meta.url); // 當前檔名
        this.__dirname = path.dirname(this.__filename); // 當前目錄名
        this.uploadPath = path.join(this.__dirname, '../../uploads');
    }

    _generateUniqueFilename = (filename) => {
        const extension = path.extname(filename);
        const originalName = path.basename(filename, extension);
        return `${uuidv4()}_${originalName}${extension}`; // 檔案格式：{uuid}_{原檔名}.{附檔名}
    };

    _calculateFileHash = (buffer) => {
        const hash = crypto.createHash('sha256');
        hash.update(buffer);
        return hash.digest('hex');
    };

    // 檢查檔案是否已經存在
    // 若不存在，將檔案存入 uploads 資料夾並記錄 hash 值
    uploadFile = async (req, res, next) => {
        try {
            if (!req.file) {
                throw new Error('No file was uploaded.');
            }

            const fileBuffer = req.file.buffer;
            const fileHash = this._calculateFileHash(fileBuffer);

            // 從 Redis 檢查 hash 是否已存在
            const cachedFile = await this.redisClient.get(fileHash);

            let fullFilename;
            if (cachedFile) {
                // 檔案已經存在
                fullFilename = cachedFile;
                logWithFileInfo('info', `File (${fullFilename}) already exists in the server.`);
            } else {
                // 檔案不存在
                fullFilename = this._generateUniqueFilename(req.file.originalname);

                // 將檔案存入 uploads 資料夾
                const filePath = path.join(this.uploadPath, fullFilename);
                await fs.promises.writeFile(filePath, fileBuffer);

                // 把新的 hash 值存入 Redis
                await this.redisClient.set(fileHash, fullFilename, { EX: 3600 * 24 * 30 }); // 30 天後過期
                logWithFileInfo('info', `File saved as ${fullFilename}`);
            }
            return fullFilename;
        } catch (err) {
            throw new Error(err);
        }
    };

    _localDownload = async (filePath) => {
        let fileHandle = null;
        fileHandle = await fs.promises.open(filePath, 'r');
        const filestream = fs.createReadStream(filePath, { fd: fileHandle.fd, autoClose: false });
        return { stream: filestream, filename: path.basename(filePath) };
    };

    _stagingAreaDownload = async (filePath, filename, userId) => {
        const s3Service = new S3Service();
        const file = {
            tempFilePath: filePath,
            name: filename,
        };
        const uploadResult = await s3Service.uploadFile(file, filename, 'user', userId);
        const [fileId, encodedFilename] = uploadResult.filename.split('_');
        const originalFilename = decodeURIComponent(encodedFilename);
        return { fileId: fileId, filename: originalFilename, location: uploadResult.location };
    };

    download = async (req, res) => {
        const userId = req.params.userId;
        const way = req.params.way;
        const fileId = req.params.fileId;

        const files = await fs.promises.readdir(this.uploadPath);
        const matchedFile = files.find((file) => file.startsWith(fileId + '_')); // 只比對檔名前面的 fileId
        if (!matchedFile) {
            throw new Error('File not found');
        }
        const safeFileName = encodeURIComponent(matchedFile);
        const filePath = path.join(this.uploadPath, matchedFile);

        // 根據不同 ways 提供不同下載方式
        if (way === 'local') {
            return this._localDownload(filePath);
        } else if (way === 'staging-area') {
            return this._stagingAreaDownload(filePath, safeFileName, userId);
        } else if (way === 'google-cloud') {
            // TODO: Integrate Google drive
        } else {
            throw new Error('Invalid download way.');
        }
    };

    deleteFile = async (req, res) => {
        const fileId = req.params.fileId;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const rootPath = path.join(__dirname, '../../uploads');

        const files = await fs.promises.readdir(rootPath);
        const matchedFile = files.find((file) => path.basename(file, path.extname(file)) === fileId);
        // 沒有匹配的檔案
        if (!matchedFile) {
            throw new Error('File not found');
        }

        const filePath = path.join(rootPath, matchedFile);
        await fs.promises.unlink(filePath); // 刪除檔案
        res.send({ message: 'File deleted successfully' });
    };
}

export default InternetFileService;
