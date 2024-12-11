import S3Service from "../services/s3Service.js";
import { logWithFileInfo } from '../../logger.js';

class ProfileController {
    constructor() {
        this.s3Service = new S3Service();
    }

    // 暫存檔案查詢
    getStagingFile = async (req, res) => {
        logWithFileInfo('info', '----ProfileController.getStagingFile');

        const userId = req.params.userId;

        try {
            const fileList = await this.s3Service.getFileList(userId);
            if (fileList.length === 0) {
                return res.status(404).json({ message: 'No files found for this user.' });
            }
            
            return res.status(200).json({ file: fileList });
        } catch (error) {
            logWithFileInfo('error', 'Error fetching staging file:', error.message);
            return res.status(500).json({ message: 'Failed to fetch staging files.', error: error.message });
        }
    }

    async getHistory(req, res) {
        console.log('----ProfileController.getHistory');
        // TODO: 實現歷史紀錄查詢
        res.status(200).json({ message: 'Get history logic not implemented yet' });
    }
}

export default ProfileController;
