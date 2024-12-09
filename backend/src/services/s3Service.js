import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logWithFileInfo } from '../../logger.js';


class S3Service {
    constructor() {
        this._s3 = new S3Client({});
        this._bucket = process.env.AWS_BUCKET_NAME;
    }

    _generateS3Key = (type, id, filename) => {
        if (type === "user") {
            return `user/${id}/${filename}`;
        } else if (type === "room") {
            return `room/${id}/${filename}`;
        } else {
            throw new Error(`[S3Service] Invalid type: ${type}`);
        }
    };

    uploadFile = async (file, filename, type, id) => {
        console.log(`[S3Service] uploadFile() called with type: ${type}, id: ${id}, filename: ${filename}`);

        const key = this._generateS3Key(type, id, filename); // S3 file key

        // 驗證檔案是否存在
        if (!fs.existsSync(file.tempFilePath)) {
            throw new Error(`[S3Service] File not found: ${file.tempFilePath}`);
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
            console.log("[S3Service] Upload Success:", data);
            return {
                filename,
                location: `https://${this._bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
            };
        } catch (err) {
            console.error("[S3Service] Upload Failed:", err.message);
            throw err;
        }
    }

    generatePresignedUrl = async (filename, type, id) => {
        console.log(`[S3Service] Generating presigned URL for type: ${type}, id: ${id}, filename: ${filename}`);

        // S3 file key
        const key = this._generateS3Key(type, id, filename); 

        // s3 下載參數
        const command = new GetObjectCommand({
            Bucket: this._bucket,
            Key: key,
        });

        // set 1 days expired
        const signedUrlExpireSeconds = 60 * 60 * 24 * 1; 

        try {
            const url = await getSignedUrl(this._s3, command, { expiresIn: signedUrlExpireSeconds });

            console.log(`[S3Service] Presigned URL generated Successfully`);
            return url;
        } catch (err) {
            console.log("[S3Service] Failed to generate presigned URL:", err.message)
            throw err;
        }
    }

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

    getFileList = async (userId) => {
        logWithFileInfo('info', '----S3server.getFileList');

        if (!userId) {
            const userIderror = new Error("User ID is required to fetch the file list");
            logWithFileInfo('error', 'Failed to fetch file list: Missing User ID', userIderror);
            throw userIderror;
        }

        const prefix = `user/${userId}/`; 
        logWithFileInfo('info', `Fetching file list for user: ${userId}, prefix: ${prefix}`);

        const params = {
            Bucket: this._bucket,
            Prefix: prefix,
        };

        try {
            const listCommand = new ListObjectsV2Command(params);
            const listData = await this._s3.send(listCommand);

            if (!listData.Contents || listData.Contents.length === 0) {
                logWithFileInfo('info', `[File List Success] No files found for user: ${userId}`);
                return [];
            }

            const fileList = await Promise.all(
                listData.Contents.map(async (item) => {
                    const headParams = {
                        Bucket: this._bucket,
                        Key: item.Key,
                    };

                    try {
                        const headCommand = new HeadObjectCommand(headParams);
                        const headData = await this._s3.send(headCommand);

                        // 確認 metadata 是否存在
                        if (!headData.Metadata || !headData.Metadata.originalname) {
                            const metadataError = new Error(`Metadata missing for file: ${item.Key}`);
                            logWithFileInfo('error', `Failed to fetch metadata for file: ${item.Key}`, metadataError);
                            throw metadataError; 
                        }
                        
                        // 轉換檔案大小顯示
                        const formattedSize = this._formatFileSize(item.Size);

                        return {
                            originalName: headData.Metadata.originalname, // 原始檔案名稱
                            filename: item.Key.split('/').pop(), // 上傳的檔案名稱
                            size: formattedSize, // 檔案大小
                            lastModified: item.LastModified, // 最後修改時間
                        };
                    } catch (err) {
                        logWithFileInfo('error',`Failed to fetch metadata for file: ${item.Key}`,err);
                        throw err
                    }
                })
            );

            logWithFileInfo("info", `[File List Success] Fetched ${fileList.length} files for user: ${userId}`);
            return fileList;
        } catch (err) {
            logWithFileInfo('error', `Failed to fetch file list for user: ${userId}`, err);
            throw err;
        }        
    }
}

export default S3Service;