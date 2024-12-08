import DynamodbService from './dynamodbService.js';
import { logWithFileInfo } from '../../logger.js';

class HistoryService {
    constructor() {
        this._dynamodbService = new DynamodbService();
    }

    history = async (userID, lastKey = null) => {
        logWithFileInfo('info', `user ${userID} try to get history transfer records`);

        // check userID
        if (!(await this._dynamodbService.isUserIDExisted(userID))) {
            logWithFileInfo('info', `user ${userID} fail to get history transfer records since invalid userID`);
            return { fail: 'invalid userID' };
        }

        // decode lastKey
        let decodedLastKey;
        try {
            decodedLastKey = this._decodeLastKey(lastKey);
            if (decodedLastKey && (!decodedLastKey.pk || !decodedLastKey)) {
                decodedLastKey = null;
            }
        } catch (SyntaxError) {
            logWithFileInfo('info', `user ${userID} fail to get history transfer records since invalid lastKey`);
            return { fail: 'invalid lastKey' };
        }

        // get transfer records from DB
        const { Items, LastEvaluatedKey } = await this._dynamodbService.getUserTransferRecords(userID, decodedLastKey);

        // reformat items
        const items = this._reformatItems(Items);

        // encode lastKey
        const encodedLastKey = this._encodeLastKey(LastEvaluatedKey);

        // get total transfer records
        const totalTransferCount = await this._dynamodbService.getUserTransferCount(userID);

        return { totalTransferCount, lastKey: encodedLastKey, items };
    };

    _interpretLabel = (label) => {
        const [type, identifier] = label.split('#');
        return { type, identifier };
    };

    _reformatItems = (items) => {
        let reformatedItems = [];
        for (const item of items) {
            const { sk, receiver, sender, fileNames } = item;
            let reformatedItem = {};
            reformatedItem['timestamp'] = sk;
            reformatedItem['sender'] = this._interpretLabel(sender);
            reformatedItem['receiver'] = this._interpretLabel(receiver);
            reformatedItem['fileNames'] = fileNames;
            reformatedItems.push(reformatedItem);
        }
        return reformatedItems;
    };

    _decodeLastKey = (lastKey) => {
        if (lastKey === null) {
            return null;
        } else {
            return JSON.parse(Buffer.from(lastKey, 'base64').toString('utf8'));
        }
    };

    _encodeLastKey = (lastKey) => {
        if (lastKey === undefined) {
            return null;
        } else {
            return Buffer.from(JSON.stringify(lastKey)).toString('base64');
        }
    };
}

export default HistoryService;
