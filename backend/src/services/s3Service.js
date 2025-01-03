import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logWithFileInfo } from '../../logger.js';

class S3Service {
    constructor() {
        this._s3 = new S3Client({});
        this._bucket = process.env.AWS_BUCKET_NAME;
    }

    _generateS3Key = (type, id, filename) => {
        if (type === 'user') {
            return `user/${id}/${filename}`;
        } else if (type === 'room') {
            return `room/${id}/${filename}`;
        } else {
            throw new Error(`Invalid type: ${type}`);
        }
    };

    uploadFile = async (file, filename, type, id) => {
        logWithFileInfo('info', `uploadFile() called with type: ${type}, id: ${id}, filename: ${filename}`);

        const key = this._generateS3Key(type, id, filename); // S3 file key
        // 驗證檔案是否存在
        if (!fs.existsSync(file.tempFilePath)) {
            throw new Error(`File not found: ${file.tempFilePath}`);
        }

        // create readable stream
        const fileStream = fs.createReadStream(file.tempFilePath);

        // s3 上傳參數
        const uploadParams = {
            Bucket: this._bucket,
            Key: key,
            Body: fileStream,
            Metadata: {
                originalName: file.name, // let metadata is origin file name
            },
        };

        try {
            const data = await this._s3.send(new PutObjectCommand(uploadParams));
            logWithFileInfo('info', `Upload Success: ${data}`);
            return {
                filename,
                location: `https://${this._bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
            };
        } catch (err) {
            logWithFileInfo('error', 'Upload Failed:', err);
            throw err;
        }
    };

    generatePresignedUrl = async (filename, type, id) => {
        logWithFileInfo('info', `Generating presigned URL for type: ${type}, id: ${id}, filename: ${filename}`);

        // S3 file key
        const key = this._generateS3Key(type, id, filename);

        let originalName = null;

        // 取得 metadata
        try {
            const metadataCommand = new HeadObjectCommand({
                Bucket: this._bucket,
                Key: key,
            });

            const metadata = await this._s3.send(metadataCommand);
            originalName = decodeURIComponent(metadata.Metadata['originalname']);
        } catch (error) {
            logWithFileInfo('error', 'Failed to fetch metadata:', error);
        }

        try {
            // s3 下載參數
            const encodedOriginalName = encodeURIComponent(originalName);
            const command = new GetObjectCommand({
                Bucket: this._bucket,
                Key: key,
                ResponseContentDisposition: `attachment; filename*=UTF-8''${encodedOriginalName}`,
            });

            // set 1 days expired
            const signedUrlExpireSeconds = 60 * 60 * 24 * 1;

            const url = await getSignedUrl(this._s3, command, { expiresIn: signedUrlExpireSeconds });

            logWithFileInfo('info', `Presigned URL generated Successfully`);
            return url;
        } catch (err) {
            logWithFileInfo('error', 'Failed to generate presigned URL:', err);
            throw err;
        }
    };

    // 轉換檔案大小顯示
    _formatFileSize = (bytes) => {
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    getFileList = async (type, id, lastKey = null) => {
        logWithFileInfo('info', '----S3server.getFileList');

        if (!id) {
            const Iderror = new Error('ID is required to fetch the file list');
            logWithFileInfo('error', 'Failed to fetch file list: Missing ID', Iderror);
            throw Iderror;
        }

        const prefix = `${type}/${id}/`;
        logWithFileInfo('info', `Fetching file list for ${type}:  ${id}, prefix: ${prefix}`);

        const params = {
            Bucket: this._bucket,
            Prefix: prefix,
            MaxKeys: 10, // 最多顯示 10 筆
            ContinuationToken: lastKey, // 根據 key 查後續筆數
        };

        try {
            const listCommand = new ListObjectsV2Command(params);
            const listData = await this._s3.send(listCommand);
            const totalFilesCount = listData.KeyCount || 0; // 取總檔案數量

            if (!listData.Contents || listData.Contents.length === 0) {
                logWithFileInfo('info', `[File List Success] No files found for ${type}: ${id}`);
                return { files: [], lastKey: null };
            }

            const fileList = await Promise.all(
                listData.Contents.map(async (item) => {
                    const originalName = item.Key.split('/').pop();
                    // metadata 取用戶上傳檔名
                    const originalKey = item.Key;
                    let decodedFilename = null;
                    try {
                        const metadataCommand = new HeadObjectCommand({
                            Bucket: this._bucket,
                            Key: originalKey,
                        });
                        const metadata = await this._s3.send(metadataCommand);
                        decodedFilename = decodeURIComponent(metadata.Metadata['originalname']);
                    } catch (error) {
                        logWithFileInfo('error', `Failed to get file metadata for ${originalKey}`, error);
                    }

                    const formattedSize = this._formatFileSize(item.Size);

                    const fileData = {
                        originalName: originalName, // 上傳 S3 的檔案名稱
                        filename: decodedFilename, // 用戶上傳的檔案名稱
                        size: formattedSize, // 檔案大小
                        lastModified: item.LastModified, // 最後修改時間
                    };

                    if (type === 'room') {
                        const presignedUrl = await this.generatePresignedUrl(fileData.originalName, 'room', id);
                        fileData.presignedUrl = presignedUrl;
                    }

                    return fileData;
                })
            );

            // 按照時間排序
            fileList.sort((a, b) => new Date(a.lastModified) - new Date(b.lastModified));

            logWithFileInfo('info', `[File List Success] Fetched ${fileList.length} files for ${type}: ${id}`);
            return {
                files: fileList,
                lastKey: encodeURIComponent(listData.NextContinuationToken) || null,
                totalFilesCount,
            };
        } catch (err) {
            logWithFileInfo('error', `Failed to fetch file list for ${type}: ${id}`, err);
            throw err;
        }
    };
}

export default S3Service;
