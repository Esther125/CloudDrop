import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import S3Service from './s3Service.js';
import { logWithFileInfo } from '../../logger.js';
import pkg from 'bloom-filters';
const { CountingBloomFilter } = pkg;
import dotenv from 'dotenv';
import redisClient from '../clients/redisClient.js';

class InternetFileService {
    constructor() {
        dotenv.config();
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

    _generateUniqueFilename = (filename, file) => {
        const extension = path.extname(filename);
        const originalName = path.basename(filename, extension);
        const fileId = this._calculateFileHash(file); // 把 fileHash 當成 fileId
        return `${fileId}_${originalName}${extension}`; // 檔案格式：{fileId}_{原檔名}.{附檔名}
    };

    _calculateFileHash = (file) => {
        const hash = crypto.createHash('sha256');
        hash.update(file);
        return hash.digest('hex');
    };

    uploadFile = async (req, res, next) => {
        try {
            if (!req.file) {
                throw new Error('No file was uploaded.');
            }

            const fileBuffer = req.file.buffer; // 暫存在 memory 中的檔案
            const originalFilename = req.file.originalname;
            const exist = this.bloomFilter.has(fileBuffer);
            let fullFilename;

            if (exist) {
                fullFilename = this._generateUniqueFilename(originalFilename, fileBuffer);
                logWithFileInfo('info', `File: ${fullFilename} already exists in the server.`);
            } else {
                fullFilename = this._generateUniqueFilename(originalFilename, fileBuffer);
                // 將檔案存入 uploads 資料夾
                const filePath = path.join(this.uploadPath, fullFilename);
                await fs.promises.writeFile(filePath, fileBuffer);

                // 將 file 加到 bloomFilter
                this.bloomFilter.add(fileBuffer);
                logWithFileInfo('info', `File saved as ${fullFilename}`);

                // 更新 bloomFilter 到 Redis
                await redisClient.connect();
                await redisClient.saveBloomFilter(this.bloomFilter);
                logWithFileInfo('info', `Bloom filter saved to Redis`);
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
        // 刪除檔案的 bloomFilter 紀錄
        const fileBuffer = await fs.promises.readFile(filePath);
        this.bloomFilter.remove(fileBuffer);

        // 刪除 /upload 中的檔案
        await fs.promises.unlink(filePath);

        // 更新 bloomFilter 到 Redis
        await redisClient.connect();
        await redisClient.saveBloomFilter(this.bloomFilter);
        logWithFileInfo('info', `Bloom filter saved to Redis`);

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

        const response = { message: 'All files deleted successfully' };
        return response;
    };
}

export default InternetFileService;
