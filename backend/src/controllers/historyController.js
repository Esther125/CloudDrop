import HistoryService from '../services/historyService.js';
import { logWithFileInfo } from '../../logger.js';

class HistoryController {
    constructor() {
        this.historyService = new HistoryService();
    }

    _reqWithMissingValue = (res, requiredValues) => {
        const missingValues = Object.entries(requiredValues)
            .filter(([_, value]) => value === undefined)
            .map(([key, _]) => key);
        res.status(400).json({ message: `${missingValues.join(', ')} is required` });
        logWithFileInfo('info', 'bad request with missing values');
    };

    history = async (req, res) => {
        logWithFileInfo('info', '----- history -----');
        const { userID, lastKey } = req.body;
        if (!userID) {
            this._reqWithMissingValue(res, { userID });
            return;
        }

        try {
            const records = await this.historyService.history(userID, lastKey);
            if (records.fail) {
                res.status(400).json({ message: records.fail });
            } else {
                res.status(200).json({ message: 'History success', ...records });
            }
        } catch (err) {
            logWithFileInfo('error', `error when user ${userID} try to get history transfer records, ${err}`, err);
            res.status(500).json({ message: `Error when user ${userID} try to get history transfer records` });
        }
    };
}

export default HistoryController;
