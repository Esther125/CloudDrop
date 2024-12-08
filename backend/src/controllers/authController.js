import AuthService from '../services/authService.js';
import { logWithFileInfo } from '../../logger.js';

class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    _reqWithMissingValue = (res, requiredValues) => {
        const missingValues = Object.entries(requiredValues)
            .filter(([_, value]) => value === undefined)
            .map(([key, _]) => key);
        res.status(400).json({ message: `${missingValues.join(', ')} is required` });
        logWithFileInfo('info', 'bad request with missing values');
    };

    register = async (req, res) => {
        logWithFileInfo('info', '-----register-----');
        const { userID, email, password, userName } = req.body;
        if (!userID || !email || !password || !userName) {
            this._reqWithMissingValue(res, { userID, email, password, userName });
            return;
        }

        try {
            const userInfo = await this.authService.register(userID, email, password, userName);
            if (userInfo.create) {
                res.status(201).json({ message: 'Register success', data: userInfo.data });
            } else {
                res.status(200).json({ message: 'User already registered', data: userInfo.data });
            }
        } catch (error) {
            logWithFileInfo('error', `error when ${email} try to register`, error);
            res.status(500).json({ message: `Error when ${email} try to register` });
        }
    };

    login = async (req, res) => {
        logWithFileInfo('info', '-----login-----');
        const { email, password } = req.body;
        if (!email || !password) {
            this._reqWithMissingValue(res, { email, password });
            return;
        }

        try {
            const loginResult = await this.authService.login(email, password);
            if (loginResult.success) {
                res.status(200).json({ message: 'Login success', data: loginResult.data });
            } else {
                res.status(401).json({ message: loginResult.error });
            }
        } catch (error) {
            logWithFileInfo('error', `error when ${email} try to login`, error);
            res.status(500).json({ message: `Error when ${email} try to login` });
        }
    };

    logout = async (req, res) => {
        logWithFileInfo('info', '-----logout-----');
        // TODO: 實現登出邏輯
        res.status(200).json({ message: 'Logout logic not implemented yet' });
    };
}

export default AuthController;
