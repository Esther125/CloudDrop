import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logWithFileInfo } from '../../logger.js';

class DynamodbService {
    constructor() {
        this._client = new DynamoDBClient({}); //  endpoint: 'http://localhost:8000' if use local DynamoDB
        this._docClient = DynamoDBDocumentClient.from(this._client);
        this._tableName = 'userInfoRecord';
    }

    createUserInfo = async (userID, email, passwordSalt, passwordHash, userName) => {
        // create a user
        logWithFileInfo('info', `[dynamodbService] try to create user info for user ${userID}`);
        /*
        user info
        - pk: USER#[userID]#INFO
        - sk: INFO
        
        - email
        - passwordSalt
        - passwordHash
        - userName
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
                },
                ConditionExpression: 'attribute_not_exists(pk)',
                ReturnValues: 'ALL_OLD',
                ReturnConsumedCapacity: 'INDEXES',
                ReturnItemCollectionMetrics: 'SIZE',
            });

            const response = await this._docClient.send(command);
            logWithFileInfo('info', `[dynamodbService] successfully create user info for user ${userID}`);
        } catch (error) {
            switch (error.name) {
                case 'ConditionalCheckFailedException':
                    logWithFileInfo(
                        'error',
                        `[dynamodbService] fail to create user info for user ${userID} since user info already exists`
                    );
                    break;
                default:
                    logWithFileInfo(
                        'error',
                        `[dynamodbService] fail to create user info for user ${userID} since ${error}`
                    );
            }
        }
    };

    getUserNameFromID = async (userID) => {
        // get userName from userID
        logWithFileInfo('info', `[dynamodbService] try to get user's name for user ${userID}`);

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
            logWithFileInfo('info', `[dynamodbService] successfully get user's name for user ${userID}`);
            return userName;
        } catch (error) {
            switch (error.name) {
                case 'TypeError':
                    logWithFileInfo(
                        'info',
                        `[dynamodbService] fail to get user's name for user ${userID} since user does not exist`
                    );
                    return null;
                default:
                    logWithFileInfo(
                        'error',
                        `[dynamodbService] fail to get user's name for user ${userID} since ${error}`
                    );
            }
        }
    };

    getUserInfoFromEmail = async (email) => {
        // get user info from email (for login)
        logWithFileInfo('info', `[dynamodbService] try to get user info from email ${email}`);

        try {
            let lastEvaluatedKey = null;
            do {
                const command = new QueryCommand({
                    TableName: this._tableName,
                    IndexName: 'userEmail',
                    ExpressionAttributeValues: {
                        ':email': email,
                    },
                    KeyConditionExpression: 'email = :email',
                    Select: 'ALL_PROJECTED_ATTRIBUTES',
                    ReturnConsumedCapacity: 'INDEXES',
                    ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
                });

                const response = await this._docClient.send(command);
                lastEvaluatedKey = response.LastEvaluatedKey;
                if (response.Items.length > 0) {
                    logWithFileInfo('info', `[dynamodbService] successfully get user info from email ${email}`);
                    return response.Items[0];
                }
            } while (lastEvaluatedKey);

            logWithFileInfo(
                'info',
                `[dynamodbService] fail to get user info from email ${email} since user does not exist`
            );
            return null;
        } catch (error) {
            logWithFileInfo('error', `[dynamodbService] fail to get user info from email ${email} since ${error}`);
        }
    };
}

export default DynamodbService;
