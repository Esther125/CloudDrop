import DynamodbService from './dynamodbService.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logWithFileInfo } from '../../logger.js';

class AuthService {
    constructor() {
        this._dynamodbService = new DynamodbService();
    }

    register = async (userID, email, password, userName) => {
        logWithFileInfo('info', `${email} try to register`);

        // check registered or not
        let create;
        let userInfo = await this._dynamodbService.getUserInfoFromEmail(email);

        if (userInfo !== null) {
            // registered
            logWithFileInfo('info', `${email} already registered`);
            create = false;
        } else {
            // not yet registered
            logWithFileInfo('info', `${email} not registered yet`);
            const passwordSalt = crypto.randomBytes(16).toString('hex');
            const passwordHash = this._hashPassword(password, passwordSalt);
            await this._dynamodbService.createUserInfo(userID, email, passwordSalt, passwordHash, userName);

            create = true;
            userInfo = await this._dynamodbService.getUserInfoFromEmail(email);

            logWithFileInfo('info', `${email} successfully registered`);
        }
        return {
            create,
            data: this._hidePasswordInfo(userInfo),
        };
    };

    _hashPassword = (password, passwordSalt) => {
        return crypto.pbkdf2Sync(password, passwordSalt, 1000, 64, 'sha512').toString('hex');
    };

    _getUserIDFromLabel = (label) => {
        return label.split('#')[1];
    };

    _hidePasswordInfo = (userInfo) => {
        return {
            userID: this._getUserIDFromLabel(userInfo.pk),
            email: userInfo.email,
            userName: userInfo.userName,
        };
    };

    login = async (email, password) => {
        // login
        logWithFileInfo('info', `${email} try to login`);

        // 1. get related user info
        let userInfo = await this._dynamodbService.getUserInfoFromEmail(email);
        if (userInfo === null) {
            // not yet registered
            logWithFileInfo('info', `${email} not yet registered`);
            return { success: false, error: 'Not yet registered' };
        }
        // 2. check password
        const passwordSalt = userInfo.passwordSalt;
        if (this._hashPassword(password, passwordSalt) !== userInfo.passwordHash) {
            logWithFileInfo('info', `${email} login with invalid password`);
            return { success: false, error: 'Invalid password' };
        }

        // 3. JWT
        const userData = this._hidePasswordInfo(userInfo);
        const accessToken = this.generateAccessToken(userData);
        const refreshToken = jwt.sign(userData, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '7d',
        });

        // 4. login successfully
        return { success: true, data: userData, tokens: { accessToken, refreshToken } };
    };

    generateAccessToken = (userData) => {
        return jwt.sign(userData, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '30m',
        });
    };
}

export default AuthService;
