import crypto from 'crypto';
import RedisClient from '../clients/redisClient.js';

class RoomService {
    constructor() {
        this._rooms = {};
        this._redis = new RedisClient();
    }

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
        console.log(`[RoomService] createRoom() called with userId: ${userId}`);

        await this._redis.connect();

        // 1. check whether user has been in a room or not
        let token = await this._redis.get(`userId:${userId}`);
        let members;
        if (token !== null) {
            console.log(`[RoomService] User ${userId} has already in the room ${token}`);
            members = await this._redis.sGet(token);
            this._redis.quit();
            return { token, members };
        }

        // 2. create room token
        token = this._createToken();
        // make sure the token is unique
        members = await this._redis.sGet(token);
        while (members.length !== 0) {
            console.log('[RoomService] Token collision detected. Generating a new token');
            token = this._createToken();
            members = await this._redis.sGet(token);
        }
        members = [userId];

        // 3. add user to redis
        await this._redis.sAdd(token, userId);
        await this._redis.set(`userId:${userId}`, token);
        await this._redis.setExpire(token, 8 * 3600);
        await this._redis.setExpire(`userId:${userId}`, 8 * 3600);

        await this._redis.quit();

        console.log(`[RoomService] Room created successfully with token: ${token}`);
        return { token, members };
    };

    joinRoom = async (userId, token) => {
        console.log('[RoomService] joinRoom() called with userId:', userId, 'and token:', token);

        await this._redis.connect();

        const inTargetRoom = await this._leaveRoom(userId, token);
        let message;
        let members;

        if (inTargetRoom) {
            message = `already in target room ${token}`;
            members = await this._redis.sGet(token);
            console.log(`[RoomService] User ${userId} have already in target room ${token}`);
            await this._redis.quit();
            return { message, members };
        }

        const roomExist = await this._redis.sExist(token);
        if (!roomExist) {
            message = `room ${token} has not been created`;
            console.log(`[RoomService] Room ${token} has not been created`);
            await this._redis.quit();
            return { message, members: [] };
        }

        await this._redis.sAdd(token, userId);
        await this._redis.set(`userId:${userId}`, token);
        await this._redis.setExpire(`userId:${userId}`, 8 * 3600);
        message = `join target room ${token} successfully`;

        members = await this._redis.sGet(token);

        console.log(`[RoomService] User ${userId} have join the room ${token}`);
        await this._redis.quit();

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

        console.log(`[RoomService] Check User ${userId} in target room or not`);

        // 1. Check user is in room or not
        const tokenFromRedis = await this._redis.get(`userId:${userId}`);
        if (tokenFromRedis === token) {
            // have already in the target room
            console.log(`[RoomService] User ${userId} has already in the room ${token}`);
            return true;
        } else if (tokenFromRedis === null) {
            // not in any room now
            console.log(`[RoomService] User ${userId} is not in any room now`);
            return false;
        }

        // 2. Leave room
        await this._redis.sRem(tokenFromRedis, userId);
        await this._redis.del(`userId:${userId}`);

        console.log(`[RoomService] User ${userId} have leave the room ${tokenFromRedis}`);

        return false;
    };
}

export default RoomService;
