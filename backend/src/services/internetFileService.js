import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ChatService from './chatService';

class InternetFileService {
    constructor() {
        this.chatService = new ChatService();
    }

    _generateUniqueFilename = (originalName) => {
        // 產生一個包含唯一識別碼(uuid)的檔案名稱
        const extension = path.extname(originalName);
        return `${uuidv4()}${extension}`;
    };

    send = async (req, res, socket, roomToken, chatNameSpace) => {
        const receiverId = req.body.receiverId;
        const fileId = req.body.fileId;
        if (!receiverId) {
            throw new Error('Receiver ID is required');
        }
        if (!fileId) {
            throw new Error('File ID is required');
        }
        // 用 web socket 將檔案資訊發送給 receiver
        this.chatService.requestFileTransfer(socket, roomToken, receiverId, fileId, chatNameSpace);
    };

    upload = async (req, res) => {
        // 實現上傳檔案邏輯
        if (!req.files || Object.keys(req.files).length === 0) {
            throw new Error('No files were uploaded.');
        }

        const uploadFile = req.files.uploadFile;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const rootPath = path.join(__dirname, '../../'); // 把路徑設定在 /backend 資料夾下

        const filename = this._generateUniqueFilename(uploadFile.name);
        const uploadPath = path.join(rootPath, '/uploads/', filename);

        // 把檔案存到指定路徑下並回傳結果
        return new Promise((resolve, reject) => {
            uploadFile.mv(uploadPath, function (err) {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve(filename);
                }
            });
        });
    };

    download = async (req, res) => {
        // TODO: 根據不同 ways 提供不同下載方式
        const fileId = req.params.fileId;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const rootPath = path.join(__dirname, '../../uploads');

        const files = await fs.promises.readdir(rootPath);
        const matchedFile = files.find((file) => path.basename(file, path.extname(file)) === fileId);
        if (!matchedFile) {
            throw new Error('File not found');
        }

        const filePath = path.join(rootPath, matchedFile);
        const fileHandle = await fs.promises.open(filePath, 'r');
        const filestream = fs.createReadStream(null, { fd: fileHandle.fd, autoClose: true });

        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        filestream.pipe(res);
    };
}

export default InternetFileService;
