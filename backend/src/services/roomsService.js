import crypto from 'crypto';
import redisClient from '../clients/redisClient.js';
import QRCode from 'qrcode';
import { logWithFileInfo } from '../../logger.js';

class RoomService {
    _createToken = () => {
        let token = '';

        const charArr = new Uint8Array(5);
        crypto.getRandomValues(charArr);

        charArr.forEach((c) => {
            let code = Math.abs((c - 65) % 26) + 65;
            token += String.fromCharCode(code);
        });

        return token;
    };

    createRoom = async (userId) => {
        logWithFileInfo('info', `[RoomService] createRoom called with userId: ${userId}`);

        await redisClient.connect();

        // 1. check whether user has been in a room or not
        let token = await redisClient.get(`userId:${userId}`);
        let members;
        if (token !== null) {
            logWithFileInfo('info', `[RoomService] User ${userId} has already in the room ${token}`);
            members = await redisClient.sGet(token);
            return { token, members };
        }

        // 2. create room token
        token = this._createToken();
        // make sure the token is unique
        members = await redisClient.sGet(token);
        while (members.length !== 0) {
            logWithFileInfo('info', '[RoomService] Token collision detected. Generating a new token');
            token = this._createToken();
            members = await redisClient.sGet(token);
        }
        members = [userId];

        // 3. add user to redis
        await redisClient.sAdd(token, userId);
        await redisClient.set(`userId:${userId}`, token);
        await redisClient.setExpire(token, 8 * 3600);
        await redisClient.setExpire(`userId:${userId}`, 8 * 3600);

        logWithFileInfo('info', `[RoomService] Room created successfully with token: ${token}`);
        return { token, members };
    };

    joinRoom = async (userId, token) => {
        logWithFileInfo('info', '[RoomService] joinRoom called with userId:', userId, 'and token:', token);

        await redisClient.connect();

        const inTargetRoom = await this._leaveRoom(userId, token);
        let message;
        let members;

        if (inTargetRoom) {
            message = `already in target room ${token}`;
            members = await redisClient.sGet(token);
            logWithFileInfo('info', `[RoomService] User ${userId} have already in target room ${token}`);
            return { message, members };
        }

        const roomExist = await redisClient.sExist(token);
        if (!roomExist) {
            message = `room ${token} has not been created`;
            logWithFileInfo('info', `[RoomService] Room ${token} has not been created`);
            return { message, members: [] };
        }

        await redisClient.sAdd(token, userId);
        await redisClient.set(`userId:${userId}`, token);
        await redisClient.setExpire(`userId:${userId}`, 8 * 3600);
        message = `join target room ${token} successfully`;

        members = await redisClient.sGet(token);

        logWithFileInfo('info', `[RoomService] User ${userId} have join the room ${token}`);

        return { message, members };
    };

    _leaveRoom = async (userId, token) => {
        /**
         * judge user in target room or not
         * if not, leave origin room
         *
         * return true: if user in target room
         * return false: if user not in target room
         */

        logWithFileInfo('info', `[RoomService] Check User ${userId} in target room or not`);

        // 1. Check user is in room or not
        const tokenFromRedis = await redisClient.get(`userId:${userId}`);
        if (tokenFromRedis === token) {
            // have already in the target room
            logWithFileInfo('info', `[RoomService] User ${userId} has already in the room ${token}`);
            return true;
        } else if (tokenFromRedis === null) {
            // not in any room now
            logWithFileInfo('info', `[RoomService] User ${userId} is not in any room now`);
            return false;
        }

        // 2. Leave room
        await redisClient.sRem(tokenFromRedis, userId);
        await redisClient.del(`userId:${userId}`);

        logWithFileInfo('info', `[RoomService] User ${userId} have leave the room ${tokenFromRedis}`);

        return false;
    };

    createQRCode = async (url) => {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(url);
            logWithFileInfo('info', 'qrCode create success');
            return qrCodeDataUrl;
        } catch (err) {
            logWithFileInfo('error', 'qrCode create error: ', err);
            return null;
        }
    };

    getMembers = async (token) => {
        try {
            await redisClient.connect();
            let members = await redisClient.sGet(token);
            return { members };
        } catch (err) {}
    };
}

export default RoomService;
