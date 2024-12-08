import jwt from 'jsonwebtoken';
import AuthService from '../services/authService.js';
import { logWithFileInfo } from '../../logger.js';

const authService = new AuthService();

const jwtMiddleware = (req, res, next) => {
    logWithFileInfo('info', '----- JWT -----');

    const { accessToken, refreshToken } = req.cookies;
    if (!accessToken || !refreshToken) {
        logWithFileInfo('info', 'missing accessToken or refreshToken');
        return res.status(401).json({ error: 'unauthorized' });
    }

    let userData;
    // check if accessToken is expired, if expired generate a new one
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        userData = _extractUserDataFromJwt(user);

        if (err) {
            // accessToken expired
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                if (err) {
                    // invalid refreshToken
                    logWithFileInfo('info', 'invalid refreshToken');
                    return res.status(401).json({ error: 'unauthorized' });
                }

                userData = _extractUserDataFromJwt(user);
                logWithFileInfo('info', 'accessToken expired, regenerate accessToken');
                const newAccessToken = authService.generateAccessToken(userData);
                res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: true });
            });
        }

        // add userData to req
        req.user = userData;
        next();
    });
};

const _extractUserDataFromJwt = (userFromJwt) => {
    return {
        userID: userFromJwt.userID,
        email: userFromJwt.email,
        userName: userFromJwt.userName,
    };
};

export default jwtMiddleware;
