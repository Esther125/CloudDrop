import { createClient } from 'redis';
import { logWithFileInfo } from '../../logger.js';

class RedisClient {
    constructor() {
        if (!RedisClient.instance) {
            logWithFileInfo('info', '[RedisClient] Initializing Redis client');
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
                logWithFileInfo('error', '[RedisClient] Redis Client Error', err);
            });

            RedisClient.instance = this;
        }

        return RedisClient.instance;
    }

    connect = async () => {
        if (!this.client.isOpen) {
            try {
                await this.client.connect();
            } catch (err) {
                logWithFileInfo('error', '[RedisClient] Error connecting to Redis:', err);
                throw err;
            }
        }
    };

    quit = async () => {
        if (this.client.isOpen) {
            try {
                await this.client.quit();
            } catch (err) {
                logWithFileInfo('error', '[RedisClient] Error quitting Redis Client', err);
                throw err;
            }
        }
    };

    set = async (key, value) => {
        try {
            await this.client.set(key, value);
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error setting value of key ${key}`, err);
            throw err;
        }
    };

    setExpire = async (key, second = 0) => {
        try {
            if (second === 0) {
                const todayEnd = new Date().setHours(3, 0, 0, 0);
                this.client.expireAt(key, parseInt(todayEnd / 1000));
                return;
            }

            await this.client.expire(key, second);
            return;
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error setting expire of key ${key}`, err);
            throw err;
        }
    };

    get = async (key) => {
        try {
            const value = await this.client.get(key);
            return value;
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error getting value of key ${key}`, err);
            throw err;
        }
    };

    del = async (key) => {
        try {
            await this.client.del(key);
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error deleting key ${key}`, err);
            throw err;
        }
    };

    sAdd = async (setKey, member) => {
        try {
            await this.client.sAdd(setKey, member);
        } catch (err) {
            logWithFileInfo('error', '[RedisClient] Error adding member to set', err);
            throw err;
        }
    };

    sGet = async (setKey) => {
        try {
            const members = await this.client.sMembers(setKey);
            return members;
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error getting all from set ${setKey}`, err);
            throw err;
        }
    };

    sRem = async (setKey, member) => {
        try {
            await this.client.sRem(setKey, member);
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error removing member from set ${setKey}`, err);
            throw err;
        }
    };

    sExist = async (setKey) => {
        try {
            const exists = await this.client.exists(setKey);
            return exists > 0;
        } catch (err) {
            logWithFileInfo('error', `[RedisClient] Error checking existence of set ${setKey}`, err);
            throw err;
        }
    };

    deleteByPattern = async (pattern) => {
        let cursor = 0;
        do {
            try {
                const reply = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
                cursor = reply['cursor'];
                const keys = reply['keys'];

                if (keys.length > 0) {
                    await this.client.del(keys);
                    logWithFileInfo('info', `[RedisClient] Deleted keys: ${keys.join(', ')}`);
                }
            } catch (err) {
                logWithFileInfo('error', `[RedisClient] Error flushing keys by pattern ${pattern}`, err);
                throw err;
            }
        } while (cursor !== 0);
    };

    deleteHashByFileId = async (specifiedFileId) => {
        let cursor = 0;
        let countDeleted = 0;

        do {
            try {
                const reply = await this.client.scan(cursor, 'MATCH', '*', 'COUNT', '100');
                cursor = reply['cursor'];
                const keys = reply['keys'];

                for (const key of keys) {
                    const value = await this.client.get(key);
                    if (value && value.includes('_')) {
                        const endIndex = value.indexOf('_');
                        const fileId = value.substring(0, endIndex);

                        if (fileId === specifiedFileId) {
                            await this.client.del(key);
                            countDeleted++;
                            logWithFileInfo('info', `[RedisClient] Deleted key: ${key} with fileId: ${fileId}`);
                        }
                    }
                }
            } catch (err) {
                logWithFileInfo('error', `[RedisClient] Error while scanning or deleting keys`, err);
                throw err;
            }
        } while (cursor !== 0);

        return countDeleted;
    };

    saveBloomFilter = async (bloomFilter) => {
        try {
            const data = JSON.stringify(bloomFilter.saveAsJSON());
            await this.client.set('bloomFilter', data);
        } catch (err) {
            logWithFileInfo('error', '[RedisClient] Error saving bloom filter to Redis', err);
            throw err;
        }
    };

    loadBloomFilter = async () => {
        try {
            const data = await this.client.get('bloomFilter');
            if (data) {
                const parsedData = JSON.parse(data);
                return parsedData;
                // return CountingBloomFilter.fromJSON(parsedData);
            } else {
                return null;
            }
        } catch (err) {
            logWithFileInfo('error', '[RedisClient] Error loading bloom filter from Redis', err);
            throw err;
        }
    };
}

const redisClient = new RedisClient();
Object.freeze(redisClient);
export default redisClient;
