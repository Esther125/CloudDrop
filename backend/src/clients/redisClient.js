import { createClient } from 'redis';

class RedisClient {
    constructor() {
        console.debug('[RedisClient] Initializing Redis client');
        this.client = createClient({
            socket: {
                reconnectStrategy: function (retries) {
                    if (retries > 5) {
                        return new Error('Too many attempts to reconnect. Redis connection was terminated');
                    } else {
                        return retries * 500;
                    }
                },
            },
        });
        this.client.on('error', (err) => {
            console.error('[RedisClient] Redis Client Error', err);
        });
    }

    connect = async () => {
        try {
            await this.client.connect();
            console.debug('[RedisClient] Connected to Redis');
        } catch (err) {
            console.error('[RedisClient] Error connecting to Redis:', err);
            throw err;
        }
    };

    set = async (key, value) => {
        try {
            await this.client.set(key, value);
            console.debug(`[RedisClient] Set key: ${key} with value: ${value}`);
        } catch (err) {
            console.error(`[RedisClient] Error setting value of key ${key}`, err);
            throw err;
        }
    };

    setExpire = async (key, second = 0) => {
        try {
            if (second === 0) {
                const todayEnd = new Date().setHours(3, 0, 0, 0);
                this.client.expireAt(key, parseInt(todayEnd / 1000));
                console.debug(`[RedisClient] Set expire time for key: ${key}`);
                return;
            }

            await this.client.expire(key, second);
            console.debug(`[RedisClient] Set expire second ${second / 3600} hours for key: ${key}`);
            return;
        } catch (err) {
            console.error(`[RedisClient] Error setting expire of key ${key}`, err);
            throw err;
        }
    };

    get = async (key) => {
        try {
            const value = await this.client.get(key);
            console.debug(`[RedisClient] Get key: ${key} with value: ${value}`);
            return value;
        } catch (err) {
            console.error(`[RedisClient] Error getting value of key ${key}`, err);
            throw err;
        }
    };

    del = async (key) => {
        try {
            await this.client.del(key);
            console.debug(`[RedisClient] Delete key: ${key}`);
        } catch (err) {
            console.error(`[RedisClient] Error deleting key ${key}`, err);
            throw err;
        }
    };

    sAdd = async (setKey, member) => {
        try {
            await this.client.sAdd(setKey, member);
            console.debug(`[RedisClient] Add member: ${member} to set: ${setKey}`);
        } catch (err) {
            console.error('[RedisClient] Error adding member to set', err);
            throw err;
        }
    };

    sGet = async (setKey) => {
        try {
            const members = await this.client.sMembers(setKey);
            console.debug(`[RedisClient] Get member of set: ${setKey}`);
            return members;
        } catch (err) {
            console.error(`[RedisClient] Error getting all from set ${setKey}`, err);
            throw err;
        }
    };

    sRem = async (setKey, member) => {
        try {
            const removedCount = await this.client.sRem(setKey, member);
            if (removedCount > 0) {
                console.debug(`[RedisClient] Removed member: ${member} from set: ${setKey}`);
            } else {
                console.debug(`[RedisClient] Member: ${member} not found in set: ${setKey}`);
            }
        } catch (err) {
            console.error(`[RedisClient] Error removing member from set ${setKey}`, err);
            throw err;
        }
    };

    sExist = async (setKey) => {
        try {
            const exists = await this.client.exists(setKey);
            console.debug(`[RedisClient] Check existence of set: ${setKey}`);
            return exists > 0;
        } catch (err) {
            console.error(`[RedisClient] Error checking existence of set ${setKey}`, err);
            throw err;
        }
    };

    quit = async () => {
        try {
            await this.client.quit();
            console.debug('[RedisClient] Quit to Redis');
        } catch (err) {
            console.error('[RedisClient] Error quitting Redis Client', err);
            throw err;
        }
    };
}

export default RedisClient;
