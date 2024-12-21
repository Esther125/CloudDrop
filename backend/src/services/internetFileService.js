import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import S3Service from './s3Service.js';
import redisClient from '../clients/redisClient.js';
import { logWithFileInfo } from '../../logger.js';

class InternetFileService {
    constructor() {
        this.__filename = fileURLToPath(import.meta.url); // 當前檔名
        this.__dirname = path.dirname(this.__filename); // 當前目錄名
        this.uploadPath = path.join(this.__dirname, '../../uploads');
    }

    _generateUniqueFilename = (filename) => {
        filename = decodeURIComponent(filename);
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
            await redisClient.connect();

            if (!req.file) {
                throw new Error('No file was uploaded.');
            }

            const fileBuffer = req.file.buffer;
            const fileHash = this._calculateFileHash(fileBuffer);

            // 從 Redis 檢查 hash 是否已存在
            const cachedFile = await redisClient.get(`fileHash:${fileHash}`);

            let fullFilename;
            if (cachedFile) {
                // 檔案已經存在
                fullFilename = cachedFile;
                logWithFileInfo('info', `File: ${fullFilename} already exists in the server.`);
            } else {
                // 檔案不存在
                fullFilename = this._generateUniqueFilename(req.file.originalname);

                // 將檔案存入 uploads 資料夾
                const filePath = path.join(this.uploadPath, fullFilename);
                await fs.promises.writeFile(filePath, fileBuffer);

                // 把新的 hash 值存入 Redis
                await redisClient.set(`fileHash:${fileHash}`, fullFilename);
                await redisClient.setExpire(`fileHash:${fileHash}`, 3600 * 24 * 30); // 30 天後過期
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

    _stagingAreaDownload = async (type, filePath, filename, id) => {
        const s3Service = new S3Service();
        const file = {
            tempFilePath: filePath,
            name: filename,
        };
        const uploadResult = await s3Service.uploadFile(file, filename, type, id);
        const [fileId, encodedFilename] = uploadResult.filename.split('_');
        const originalFilename = decodeURIComponent(encodedFilename);
        return { fileId: fileId, filename: originalFilename, location: uploadResult.location };
    };

    download = async (req, res) => {
        const way = req.params.way;
        const fileId = req.params.fileId;
        const { type, id } = req.query;

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
            if (!type || !id) {
                throw new Error('Type and id query parameters are required for staging-area download.');
            }
            return this._stagingAreaDownload(type, filePath, safeFileName, id);
        } else if (way === 'google-cloud') {
            // TODO: Integrate Google drive
        } else {
            throw new Error('Invalid download way.');
        }
    };

    deleteFile = async (req, res) => {
        const fileId = req.params.fileId;
        const files = await fs.promises.readdir(this.uploadPath);
        const matchedFile = files.find((file) => {
            const filename = path.basename(file);
            const extractedFileId = filename.split('_')[0];
            return extractedFileId === fileId;
        });

        if (!matchedFile) {
            throw new Error('File not found');
        }

        const filePath = path.join(this.uploadPath, matchedFile);
        // 刪除 /upload 中的檔案
        await fs.promises.unlink(filePath);
        // 刪除 Redis 中的 hash 紀錄
        await redisClient.connect();
        await redisClient.deleteHashByFileId(fileId);
        const response = { message: 'File deleted successfully' };
        return response;
    };

    deleteAllFiles = async (req, res) => {
        const files = await fs.promises.readdir(this.uploadPath);
        for (const file of files) {
            const filePath = path.join(this.uploadPath, file);
            await fs.promises.unlink(filePath);
        }
        // 刪除 Redis 中所有 file hash 的紀錄
        await redisClient.connect();
        await redisClient.deleteByPattern('fileHash:*');
        const response = { message: 'All files deleted successfully' };
        return response;
    };
}

export default InternetFileService;
