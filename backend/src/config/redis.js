const Redis = require('ioredis');
require('dotenv').config();

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USER || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB,
        retryStrategy: () => null,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        enableOfflineQueue: false
      });

      this.client.on('connect', () => {
        console.log('Redis Connecting');
      });
      this.client.on('ready', async () => {
        this.isConnected = true;
        console.log('Redis Connected Successfully');
        try {
          await this.client.config('SET', 'maxmemory-policy', 'noeviction');
        } catch (e) {
          // Ignore if cloud provider blocks CONFIG SET
        }
      });
      this.client.on('error', (error) => {
        console.error('Redis connection error:', error.message);
        this.isConnected = false;
      });
      this.client.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });
      await this.client.connect();
      return this.client;
    }
    catch (error) {
      console.error('Failed to initialize Redis:', error.message);
      // In production, you might want to exit the process
      // For development, we can continue without Redis
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    }
    catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error.message);
      return 0;
    }
  }

  async increment(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error.message);
      return 0;
    }
  }

  async expire(key, seconds) {
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error.message);
      return false;
    }
  }

  async hset(key, field, value) {
    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      console.error(`Redis HSET error for key ${key}:`, error.message);
      return false;
    }
  }

  async hget(key, field) {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${key}:`, error.message);
      return null;
    }
  }
}

const redis = new RedisClient();
module.exports = redis;