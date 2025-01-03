import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto, { randomUUID } from 'crypto';
import S3Service from './s3Service.js';
import { logWithFileInfo } from '../../logger.js';
import pkg from 'bloom-filters';
const { CountingBloomFilter } = pkg;
import redisClient from '../clients/redisClient.js';

class InternetFileService {
    constructor() {
        this.__filename = fileURLToPath(import.meta.url); // 當前檔名
        this.__dirname = path.dirname(this.__filename); // 當前目錄名
        this.uploadPath = path.join(this.__dirname, '../../uploads');
        this.initFilter(); // 初始化 bloomFilter
    }

    async initFilter() {
        this.bloomFilter = await this._loadFilter();
    }

    _loadFilter = async () => {
        await redisClient.connect();
        const parseData = await redisClient.loadBloomFilter();
        if (!parseData) {
            // 原本沒有 bloomFilter
            const filter = new CountingBloomFilter.create(
                parseInt(process.env.BLOOM_FILTER_ESTIMATED_FILE_COUNT),
                parseFloat(process.env.BLOOM_FILTER_ERROR_RATE)
            );
            // 將初始化的 bloomFilter 存入 Redis
            await redisClient.saveBloomFilter(filter);
            return filter;
        }
        // 原本就有 bloomFilter，從 Redis 取出轉換
        const filter = CountingBloomFilter.fromJSON(parseData);
        return filter;
    };

    _generateUniqueFilename = (filename, fileHash) => {
        const extension = path.extname(filename);
        return `${fileHash}${extension}`; // 檔名格式：{fileHash}.{附檔名}
    };

    _calculateFileHash = (file) => {
        const hash = crypto.createHash('sha256');
        hash.update(file);
        return hash.digest('hex');
    };

    _saveFileInfo = (fileId, fileHash, originalFilename) => {
        // 在 Redis 存 fileId 對應的 fileHash 和 originalFilename
        redisClient.set(`file:${fileId}:hash`, fileHash);
        redisClient.setExpire(`file:${fileId}:hash`, 3600 * 24 * 30); // 30 days expire
        redisClient.set(`file:${fileId}:filename`, originalFilename);
        redisClient.setExpire(`file:${fileId}:filename`, 3600 * 24 * 30); // 30 days expire
        logWithFileInfo('info', `File info saved to Redis.`);
    };

    uploadFile = async (req, res, next) => {
        try {
            if (!req.file) {
                throw new Error('No file was uploaded.');
            }
            const fileBuffer = req.file.buffer; // 暫存在 memory 中的檔案
            const fileId = randomUUID();
            const originalFilename = decodeURIComponent(req.file.originalname);
            const fileHash = this._calculateFileHash(fileBuffer);
            this._saveFileInfo(fileId, fileHash, originalFilename);

            const exist = this.bloomFilter.has(fileBuffer);
            const fullFilename = this._generateUniqueFilename(originalFilename, fileHash);

            if (exist) {
                logWithFileInfo('info', `File: ${fullFilename} already exists in the server.`);
            } else {
                // 將檔案存入 uploads 資料夾
                const filePath = path.join(this.uploadPath, fullFilename);
                await fs.promises.writeFile(filePath, fileBuffer);

                // 將 file 加到 bloomFilter
                this.bloomFilter.add(fileBuffer);
                logWithFileInfo('info', `File ID: ${fileId} successfully saved as ${fullFilename}`);

                // 更新 bloomFilter 到 Redis
                await redisClient.connect();
                await redisClient.saveBloomFilter(this.bloomFilter);
                logWithFileInfo('info', `Bloom filter saved to Redis`);
            }
            return { fileId: fileId, fileName: originalFilename };
        } catch (err) {
            throw new Error(err);
        }
    };

    _localDownload = async (filePath, fileId) => {
        let fileHandle = null;
        fileHandle = await fs.promises.open(filePath, 'r');
        const filestream = fs.createReadStream(filePath, { fd: fileHandle.fd, autoClose: false });

        await redisClient.connect();
        const originalFilename = await redisClient.get(`file:${fileId}:filename`);
        return { stream: filestream, filename: originalFilename };
    };

    _stagingAreaDownload = async (type, filePath, fileName, fileId, id) => {
        await redisClient.connect();
        const originalFilename = await redisClient.get(`file:${fileId}:filename`);

        const safeFilename = encodeURIComponent(originalFilename);
        const file = {
            tempFilePath: filePath,
            name: safeFilename, // S3 metadata (originalName)
        };
        const s3Service = new S3Service();
        const uploadResult = await s3Service.uploadFile(file, fileName, type, id);
        return { fileId: fileId, filename: originalFilename, location: uploadResult.location };
    };

    download = async (req, res) => {
        const way = req.params.way;
        const fileId = req.params.fileId;
        const { type, id } = req.query;

        await redisClient.connect();
        const fileHash = await redisClient.get(`file:${fileId}:hash`);
        const files = await fs.promises.readdir(this.uploadPath);
        const matchedFile = files.find((file) => file.startsWith(fileHash));
        if (!matchedFile) {
            throw new Error('File not found');
        }
        const filePath = path.join(this.uploadPath, matchedFile);

        // 根據不同 ways 提供不同下載方式
        if (way === 'local') {
            return this._localDownload(filePath, fileId);
        } else if (way === 'staging-area') {
            if (!type || !id) {
                throw new Error('Type and id query parameters are required for staging-area download.');
            }
            return this._stagingAreaDownload(type, filePath, matchedFile, fileId, id);
        } else if (way === 'google-cloud') {
            // TODO: Integrate Google drive
        } else {
            throw new Error('Invalid download way.');
        }
    };

    deleteFile = async (req, res) => {
        const fileId = req.params.fileId;
        const files = await fs.promises.readdir(this.uploadPath);

        await redisClient.connect();
        const fileHash = await redisClient.get(`file:${fileId}:hash`);
        const matchedFile = files.find((file) => file.includes(fileHash));

        if (!matchedFile) {
            throw new Error('File not found');
        }

        // 刪除檔案的 bloomFilter 紀錄
        const filePath = path.join(this.uploadPath, matchedFile);
        const fileBuffer = await fs.promises.readFile(filePath);
        this.bloomFilter.remove(fileBuffer);

        // 刪除 /upload 中的檔案
        await fs.promises.unlink(filePath);
        logWithFileInfo('info', `File ID: ${fileId} deleted successfully.`);

        // 更新 bloomFilter 到 Redis
        await redisClient.saveBloomFilter(this.bloomFilter);
        logWithFileInfo('info', `Bloom filter saved to Redis`);

        // 刪除 Redis 中的 fileId 對應的 fileHash 和 originalFilename
        await redisClient.deleteFileInfoByFileId(fileId);
        logWithFileInfo('info', `File info deleted from Redis.`);
        // 一併刪除同樣 fileHash 的檔案相關資料
        await redisClient.deleteFileInfoWithSameHash(fileHash);

        const response = { message: 'File deleted successfully' };
        return response;
    };

    deleteAllFiles = async (req, res) => {
        const files = await fs.promises.readdir(this.uploadPath);
        for (const file of files) {
            const filePath = path.join(this.uploadPath, file);
            await fs.promises.unlink(filePath);
        }
        // 創一個新的空的 bloomFilter
        this.bloomFilter = new CountingBloomFilter.create(
            parseInt(process.env.BLOOM_FILTER_ESTIMATED_FILE_COUNT),
            parseFloat(process.env.BLOOM_FILTER_ERROR_RATE)
        );
        // 更新 bloomFilter 到 Redis
        await redisClient.connect();
        await redisClient.saveBloomFilter(this.bloomFilter);
        logWithFileInfo('info', `Bloom filter saved to Redis`);

        // 刪除 Redis 中所有 fileId 對應的 fileHash 和 originalFilename
        await redisClient.deleteByPattern('file:*:hash');
        await redisClient.deleteByPattern('file:*:filename');
        logWithFileInfo('info', `All file info deleted from Redis.`);

        const response = { message: 'All files deleted successfully' };
        return response;
    };
}

export default InternetFileService;
