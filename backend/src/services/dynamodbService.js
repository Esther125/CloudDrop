import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { logWithFileInfo } from '../../logger.js';

class DynamodbService {
    constructor() {
        this._client = new DynamoDBClient({}); //  endpoint: 'http://localhost:8000' if use local DynamoDB
        this._docClient = DynamoDBDocumentClient.from(this._client);
        this._tableName = 'userInfoRecord';
    }

    /* -------- for user info -------- */
    createUserInfo = async (userID, email, passwordSalt, passwordHash, userName) => {
        // create a user
        logWithFileInfo('info', `try to create user info for user ${userID}`);
        /*
        user info
        - pk: USER#[userID]#INFO
        - sk: INFO
        - email
        - passwordSalt
        - passwordHash
        - userName
        - transferCount
        */
        try {
            const command = new PutCommand({
                TableName: this._tableName,
                Item: {
                    pk: `USER#${userID}#INFO`,
                    sk: 'INFO',
                    email,
                    passwordSalt,
                    passwordHash,
                    userName,
                    transferCount: 0,
                },
                ConditionExpression: 'attribute_not_exists(pk)',
                ReturnValues: 'ALL_OLD',
                ReturnConsumedCapacity: 'INDEXES',
                ReturnItemCollectionMetrics: 'SIZE',
            });

            const response = await this._docClient.send(command);
            logWithFileInfo('info', `successfully create user info for user ${userID}`);
        } catch (error) {
            switch (error.name) {
                case 'ConditionalCheckFailedException':
                    logWithFileInfo(
                        'error',
                        `fail to create user info for user ${userID} since user info already exists`,
                        error
                    );
                    break;
                default:
                    logWithFileInfo('error', `fail to create user info for user ${userID} since ${error}`, error);
            }
        }
    };

    getUserNameFromID = async (userID) => {
        // get userName from userID
        logWithFileInfo('info', `try to get user's name for user ${userID}`);

        try {
            const command = new GetCommand({
                TableName: this._tableName,
                Key: {
                    pk: `USER#${userID}#INFO`,
                    sk: 'INFO',
                },
                ProjectionExpression: 'userName',
                ReturnConsumedCapacity: 'INDEXES',
            });

            const response = await this._docClient.send(command);
            const userName = response.Item.userName;
            logWithFileInfo('info', `successfully get user's name for user ${userID}`);
            return userName;
        } catch (error) {
            switch (error.name) {
                case 'TypeError':
                    logWithFileInfo('info', `fail to get user's name for user ${userID} since user does not exist`);
                    return null;
                default:
                    logWithFileInfo('error', `fail to get user's name for user ${userID} since ${error}`, error);
                    return null;
            }
        }
    };

    getUserInfoFromEmail = async (email) => {
        // get user info from email (for login)
        logWithFileInfo('info', `try to get user info from email ${email}`);

        try {
            const command = new QueryCommand({
                TableName: this._tableName,
                IndexName: 'userEmail',
                ExpressionAttributeValues: {
                    ':email': email,
                },
                KeyConditionExpression: 'email = :email',
                Limit: 1,
                Select: 'ALL_PROJECTED_ATTRIBUTES',
                ReturnConsumedCapacity: 'INDEXES',
            });

            const response = await this._docClient.send(command);
            if (response.Items.length > 0) {
                logWithFileInfo('info', `successfully get user info from email ${email}`);
                return response.Items[0];
            }

            logWithFileInfo('info', `fail to get user info from email ${email} since user does not exist`);
            return null;
        } catch (error) {
            logWithFileInfo('error', `fail to get user info from email ${email} since ${error}`, error);
            return null;
        }
    };

    isUserIDExisted = async (userID) => {
        return (await this.getUserNameFromID(userID)) !== null;
    };

    /* -------- for transfer records -------- */
    createTransferRecords = async (sender, receiver, fileNames) => {
        logWithFileInfo('info', `try to create transfer records ${JSON.stringify({ sender, receiver, fileNames })}`);

        /* check sender and receiver format and type
        結構（依本身所屬的類別判斷）:
        1. user
            { type: "USER", identifier: userID }
        2. temp (user without login)
            { type: "TEMP", identifier: tempName }
        3. room
            { type: "ROOM", identifier: roomToken }
        */
        const senderLabel = this._createLabel(sender);
        const receiverLabel = this._createLabel(receiver);
        if (!senderLabel || !receiverLabel || !Array.isArray(fileNames) || fileNames.length < 1) {
            logWithFileInfo(
                'error',
                `fail to create transfer records ${JSON.stringify({ sender, receiver, fileNames })} since invalid format`,
                error
            );
            return;
        }

        let successCounter = 0;
        let success;
        const transferTime = new Date().toISOString();

        // create if user existed
        for (const label of [senderLabel, receiverLabel]) {
            const [type, identifier] = label.split('#');
            if (type === 'USER') {
                if (!this.isUserIDExisted(identifier)) {
                    logWithFileInfo(
                        'error',
                        `fail to create transfer records ${JSON.stringify({ sender, receiver, fileNames })} since with invalid userID`,
                        error
                    );
                    return;
                }
            }
        }

        // create transfer record for individual 'user'
        for (const label of [senderLabel, receiverLabel]) {
            const [type, identifier] = label.split('#');
            if (type === 'USER') {
                success = await this._createTransferRecordForUser(
                    identifier,
                    transferTime,
                    senderLabel,
                    receiverLabel,
                    fileNames
                );
            }
            if (success) {
                successCounter++;
            }
        }

        logWithFileInfo(
            'info',
            `create ${successCounter} transfer records for ${JSON.stringify({ sender, receiver, fileNames })}`
        );
    };

    _createLabel = (target) => {
        /* 
        target (sender 和 receiver) 的結構（依本身所屬的類別判斷）:
        1. user
            { type: "USER", identifier: userID }
        2. temp (user without login)
            { type: "TEMP", identifier: tempName }
        3. room
            { type: "ROOM", identifier: roomToken }
        */
        const validType = ['USER', 'TEMP', 'ROOM'];
        if (!validType.includes(target.type?.toUpperCase()) && !target.identifier) {
            return null;
        } else {
            return `${target.type.toUpperCase()}#${target.identifier}`;
        }
    };

    _createTransferRecordForUser = async (userID, timestamp, senderLabel, receiverLabel, fileNames) => {
        logWithFileInfo(
            'info',
            `try to create transfer record ${JSON.stringify({ sender: senderLabel, receiver: receiverLabel, fileNames })} for user ${userID}`
        );

        /*
        transfer record 
        （傳輸雙方中只要有任一方是 user，就需要以該 userID 存一份；如果雙方都是會各存一份）
        - pk: USER#[userID]#RECORD
        - sk: [timestamp]
        - sender: USER#[userID] / TEMP#[tempName]
        - receiver: USER#[userID] / TEMP#[tempName] / ROOM#[roomToken]
        - fileNames
        */

        try {
            const command = new PutCommand({
                TableName: this._tableName,
                Item: {
                    pk: `USER#${userID}#RECORD`,
                    sk: timestamp,
                    sender: senderLabel,
                    receiver: receiverLabel,
                    fileNames,
                },
                ReturnValues: 'ALL_OLD',
                ReturnConsumedCapacity: 'INDEXES',
                ReturnItemCollectionMetrics: 'SIZE',
            });

            await this._docClient.send(command);
            await this._updateUserTransferCount(userID);

            logWithFileInfo(
                'info',
                `successfully create transfer record ${JSON.stringify({ sender: senderLabel, receiver: receiverLabel, fileNames })} for user ${userID}`
            );
            return true;
        } catch (error) {
            logWithFileInfo(
                'error',
                `fail to create transfer record ${JSON.stringify({ sender: senderLabel, receiver: receiverLabel, fileNames })} for user ${userID}`,
                error
            );
            return false;
        }
    };

    _updateUserTransferCount = async (userID) => {
        // transferCount + 1 when add a new transfer record
        try {
            const command = new UpdateCommand({
                TableName: this._tableName,
                Key: {
                    pk: `USER#${userID}#INFO`,
                    sk: 'INFO',
                },
                ConditionExpression: 'attribute_exists(pk)',
                UpdateExpression: 'ADD transferCount :increment',
                ExpressionAttributeValues: {
                    ':increment': 1,
                },
                ReturnValues: 'UPDATED_NEW',
                ReturnConsumedCapacity: 'INDEXES',
                ReturnItemCollectionMetrics: 'SIZE',
            });

            const response = await this._docClient.send(command);
            const transferCount = response.Attributes.transferCount;
            logWithFileInfo('info', `update transferCount to ${transferCount} for user ${userID}`);
            return transferCount;
        } catch (error) {
            switch (error.name) {
                case 'ConditionalCheckFailedException':
                    logWithFileInfo(
                        'error',
                        `fail to update transferCount for user ${userID} since user info not exists`,
                        error
                    );
                    break;
                default:
                    logWithFileInfo('error', `fail to create user info for user ${userID} since ${error}`, error);
            }
            return null;
        }
    };

    getUserTransferRecords = async (userID, lastEvaluatedKey = null) => {
        // get user transfer records from userID
        logWithFileInfo('info', `try to get user's transfer records for user ${userID}`);

        try {
            const command = new QueryCommand({
                TableName: this._tableName,
                ExpressionAttributeValues: {
                    ':pk': `USER#${userID}#RECORD`,
                },
                KeyConditionExpression: 'pk = :pk',
                ScanIndexForward: false,
                Limit: 10,
                Select: 'ALL_ATTRIBUTES',
                ReturnConsumedCapacity: 'INDEXES',
                ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
            });

            const { Items, LastEvaluatedKey } = await this._docClient.send(command);
            logWithFileInfo('info', `successfully get user's transfer records for user ${userID}`);
            return { Items, LastEvaluatedKey };
        } catch {
            logWithFileInfo('error', `fail to get user's transfer records for user ${userID}`, error);
            return null;
        }
    };

    getUserTransferCount = async (userID) => {
        // get transferCount from userID
        logWithFileInfo('info', `try to get user's transferCount for user ${userID}`);

        try {
            const command = new GetCommand({
                TableName: this._tableName,
                Key: {
                    pk: `USER#${userID}#INFO`,
                    sk: 'INFO',
                },
                ProjectionExpression: 'transferCount',
                ReturnConsumedCapacity: 'INDEXES',
            });

            const response = await this._docClient.send(command);
            const transferCount = response.Item.transferCount;
            logWithFileInfo('info', `successfully get user's transferCount ${transferCount} for user ${userID}`);
            return transferCount;
        } catch (error) {
            switch (error.name) {
                case 'TypeError':
                    logWithFileInfo(
                        'info',
                        `fail to get user's transferCount for user ${userID} since user does not exist`
                    );
                    break;
                default:
                    logWithFileInfo(
                        'error',
                        `fail to get user's transferCount for user ${userID} since ${error}`,
                        error
                    );
            }
            return null;
        }
    };
}

export default DynamodbService;
