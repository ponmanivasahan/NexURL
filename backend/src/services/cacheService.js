const redis=require('../config/redis');
const logger=require('../utils/logger');

class CacheService{
    constructor(){
        this.TTL={
            REDIRECT:24*60*60,
            POPULAR_URL:7*24*60*60,
            USER_SESSION:7*24*60*60,
            ANALYTICS:5*60,
            RATE_LIMIT:60,
            TEMP_DATA:60*60
        };


        this.PREFIX={
            URL:'url',
            POPULAR:'popular',
            ANALYTICS:'analytics',
            SESSION:'session',
            RATE_LIMIT:'ratelimit',
            LOCK:'lock'
        }
    }

    async cacheAside(key,fetchFunction,ttl=this.TTL.REDIRECT){
        try {
            const cached=await redis.get(key);
            if(cached){
                logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached);
            }
            logger.debug(`Cache Miss: ${key}`);
            const data=await fetchFunction();

            if (data !== null && data !== undefined) {
              await redis.set(key, JSON.stringify(data), ttl);
            }
            
            return data;
        } catch (error) {
            logger.error(`Cache aside error for key ${key}:`, error);
            return await fetchFunction();
        }
    }

    async cacheAsideWithLock(key,fetchFunction,ttl=this.TTL.REDIRECT){
        const lockKey = `${this.PREFIX.LOCK}${key}`;
        const maxRetries = 3;
        const retryDelay = 100;

        try {
            const cached=await redis.get(key);
            if(cached){
                logger.debug(`Cache hit with lock:${key}`);
                return JSON.parse(cached);
            }
        logger.debug(`Cache MISS with lock: ${key}`);

        const lockAcquired=await this.acquireLock(lockKey,10);
        if(lockAcquired){
           try{
             const data=await fetchFunction();
             if (data !== null && data !== undefined) {
                await redis.set(key, JSON.stringify(data), ttl);
             }
             return data;
           }
           finally{
             await this.releaseLock(lockKey);
           }
        }
        else{
            for(let i=0;i<maxRetries;i++){
               await this.sleep(retryDelay*Math.pow(2,i));

               const retryCache=await redis.get(key);
               if (retryCache) {
                 logger.debug(`Retry HIT for ${key} after ${i + 1} attempts`);
                return JSON.parse(retryCache);
              }
            }

            logger.warn(`Lock wait timeout for ${key}, fetching directly`);
            const data=await fetchFunction();
            return data;
        }
        } catch (error) {
            logger.error(`Cache with lock error for ${key}:`, error);
            return await fetchFunction();
        }
    }


    async writeThrough(key,data,ttl=this.TTL.ANALYTICS){
        try{
         await redis.set(key,JSON.stringify(data),ttl);
         return true;
        }
        catch(error){
         logger.error(`Write-through error for ${key}:`, error);
         return false;
        }
    }

    async trackPopularUrl(shortCode,originalUrl){
        try {
            const counterKey=`${this.PREFIX.POPULAR}${shortCode}:counter`;
            const threshold=100;
            const count=await redis.increment(counterKey);
            
            if (count >= threshold) {
                const urlKey = `${this.PREFIX.URL}${shortCode}`;
                await redis.set(urlKey, originalUrl, this.TTL.POPULAR_URL);
                logger.info(`URL ${shortCode} marked as popular with ${count} clicks`);
            }
            return count;

        } catch (error) {
            logger.error(`Popular URL tracking error for ${shortCode}:`, error);
            return 0;
        }
    }

    async preloadCache(urls) {
    try {
      const pipeline = redis.client.pipeline();
      
      for (const { shortCode, originalUrl } of urls) {
        const key = `${this.PREFIX.URL}${shortCode}`;
        pipeline.set(key, originalUrl, 'EX', this.TTL.REDIRECT);
      }
      
      await pipeline.exec();
      logger.info(`Preloaded ${urls.length} URLs into cache`);
      return true;
    } catch (error) {
      logger.error('Cache preloading error:', error);
      return false;
    }
  }

  async invalidateUrl(shortCode) {
    try {
      const key = `${this.PREFIX.URL}${shortCode}`;
      await redis.del(key);
      logger.debug(`Invalidated cache for URL: ${shortCode}`);
    } catch (error) {
      logger.error(`Cache invalidation error for ${shortCode}:`, error);
    }
  }

  
  async invalidatePattern(pattern){
    try {
        let cursor='0';
        let deletedCount=0;
         do {
        const [newCursor, keys] = await redis.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        cursor = newCursor;
        
        if (keys.length > 0) {
          await redis.client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');
      
      logger.info(`Invalidated ${deletedCount} keys matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
        logger.error(`Pattern invalidation error for ${pattern}:`,error);
        return 0;
    }
  }

  async warmCache(shortCode,fetchFunction,ttl=this.TTL.REDIRECT){
    try {
        const key=`${this.PREFIX.URL}${shortCode}`;
        const lockKey=`${this.PREFIX.LOCK}warm:${shortCode}`;

        const lockAcquired=await this.acquireLock(lockKey,60);
        if(!lockAcquired) return;

         try {
        const data = await fetchFunction();
        if (data) {
          await redis.set(key, JSON.stringify(data), ttl);
          logger.debug(`Warmed cache for ${shortCode}`);
        }
      } finally {
        await this.releaseLock(lockKey);
      }
    } catch (error) {
        logger.error(`Cache warming error for ${shortCode}`)
    }
  }


  async acquireLock(lockKey,ttlSeconds=10){
    try{
     const result = await redis.client.set(
        lockKey,
        Date.now().toString(),
        'NX',
        'EX',
        ttlSeconds
      );
      
      return result === 'OK';
    }
    catch(error){
     logger.error(`Lock acquisition error for ${lockKey}:`, error);
     return false;
    }
  }

  async releaseLock(lockKey) {
    try {
      await redis.del(lockKey);
    } catch (error) {
      logger.error(`Lock release error for ${lockKey}:`, error);
    }
  }

  async getStats() {
    try {
      const info = await redis.client.info();
      const dbSize = await redis.client.dbsize();
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'unknown';
      
      // Parse hit rate
      const hitsMatch = info.match(/keyspace_hits:(\d+)/);
      const missesMatch = info.match(/keyspace_misses:(\d+)/);
      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const hitRate = hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : 0;
      
      return {
        memory,
        totalKeys: dbSize,
        hits,
        misses,
        hitRate: `${hitRate}%`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const cacheService=new CacheService();
module.exports=cacheService;