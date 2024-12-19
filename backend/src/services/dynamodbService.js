import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

class DynamodbService {
    constructor() {
        this._client = new DynamoDBClient({}); //  endpoint: 'http://localhost:8000' if use local DynamoDB
        this._docClient = DynamoDBDocumentClient.from(this._client);
        this._tableName = 'userInfoRecord';
    }

    createUserInfo = async (userID, email, passwordSalt, passwordHash, userName) => {
        // create a user
        console.log(`[dynamodbService] try to create user info for user ${userID}`);
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
            console.log(`[dynamodbService] successfully create user info for user ${userID}`);
        } catch (error) {
            switch (error.name) {
                case 'ConditionalCheckFailedException':
                    console.error(
                        `[dynamodbService] fail to create user info for user ${userID} since user info already exists`
                    );
                    break;
                default:
                    console.error(`[dynamodbService] fail to create user info for user ${userID} since ${error}`);
            }
        }
    };

    getUserNameFromID = async (userID) => {
        // get userName from userID
        console.log(`[dynamodbService] try to get user's name for user ${userID}`);

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
            console.log(`[dynamodbService] successfully get user's name for user ${userID}`);
            return userName;
        } catch (error) {
            switch (error.name) {
                case 'TypeError':
                    console.log(
                        `[dynamodbService] fail to get user's name for user ${userID} since user does not exist`
                    );
                    return null;
                default:
                    console.error(`[dynamodbService] fail to get user's name for user ${userID} since ${error}`);
            }
        }
    };

    getUserInfoFromEmail = async (email) => {
        // get user info from email (for login)
        console.log(`[dynamodbService] try to get user info from email ${email}`);

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
                    console.log(`[dynamodbService] successfully get user info from email ${email}`);
                    return response.Items[0];
                }
            } while (lastEvaluatedKey);

            console.log(`[dynamodbService] fail to get user info from email ${email} since user does not exist`);
            return null;
        } catch (error) {
            console.error(`[dynamodbService] fail to get user info from email ${email} since ${error}`);
        }
    };
}

export default DynamodbService;
