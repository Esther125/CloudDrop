import InternetFileService from '../services/internetFileService.js';
import path from 'path';
import { logWithFileInfo } from '../../logger.js';

class InternetFileController {
    constructor() {
        this.internetFileService = new InternetFileService();
    }

    upload = async (req, res) => {
        logWithFileInfo('info', '[InternetFileController] -----upload-----');
        try {
            const filename = await this.internetFileService.upload(req, res);
            const fileId = path.basename(filename, path.extname(filename));
            res.status(200).json({ message: 'File uploaded successfully.', fileId: fileId });
        } catch (error) {
            logWithFileInfo('error', '[InternetFileController] Error uploading the file');
            res.status(500).json({ message: 'Failed to upload the file.', error: error.message });
        }
    };

    download = async (req, res) => {
        logWithFileInfo('info', '[InternetFileController] -----download-----');
        try {
            await this.internetFileService.download(req, res);
            logWithFileInfo('info', '[InternetFileController] File donwloaded successfully.');
        } catch (error) {
            logWithFileInfo('error', 'Error downloading file: ', error);
            res.status(500).json({
                message: 'Failed to download the file.',
                error: error.message,
            });
        }
    };

    deleteFile = async (req, res) => {
        logWithFileInfo('info', '[InternetFileController] -----deleteFile-----');
        try {
            await this.internetFileService.deleteFile(req, res);
            logWithFileInfo('info', '[InternetFileController] File deleted successfully.');
        } catch (error) {
            logWithFileInfo('error', '[InternetFileController] Error deleting file: ', error);
            const errorMsg = { message: 'Failed to delete the file', error: error.message };
            if (error.message === 'File not found') {
                res.status(404).send(errorMsg);
            } else {
                res.status(500).send(errorMsg);
            }
        }
    };
}

export default InternetFileController;
