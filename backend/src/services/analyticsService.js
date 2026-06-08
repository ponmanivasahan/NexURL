const db=require('../config/db');
const cacheService=require('./cacheService');
const logger=require('../utils/logger');
const { redis } = require('../config');

class AnalyticsService{
    async getClickCount(urlId,peroid='all'){
        const cacheKey=`analytics:clicks:${urlId}:${period}`;

        return await cacheService.cacheAside(
            cacheKey,async()=>{
                let query;
                let params=[urlId];

                switch(peroid){
                    case 'hour':
                        query=`SELECT COUNT(*) as count FROM click_events WHERE url_id=? AND clicked_at>=DATE_SUB(NOW(),INTERVAL 1 HOUR)`;
                        break;

                    case 'day':
                        query = `SELECT COUNT(*) as count FROM click_events WHERE url_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`;
                        break;
                    case 'week':
                        query=`SELECT COUNT(*) as count FROM click_events WHERE url_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
                        break;
                    case 'month':
                        query=`SELECT COUNT(*) as count FROM click_events WHERE url_id=? AND clicked_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)`;
                        break;
                    default:
                        query = `SELECT COUNT(*) as count FROM click_events WHERE url_id = ?`;
                }

                const [result]=await db.query(query,params);
                return result.count;
            },
            cacheService.TTL.ANALYTICS
        )
    }

    async getHourlyAnalytics(urlId, hours = 24) {
    const cacheKey = `analytics:hourly:${urlId}:${hours}`;
    
    return await cacheService.cacheAside(
      cacheKey,
      async () => {
        const query = `
          SELECT 
            DATE_FORMAT(clicked_at, '%Y-%m-%d %H:00:00') as hour,
            COUNT(*) as clicks
          FROM click_events
          WHERE url_id = ?
            AND clicked_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
          GROUP BY DATE_FORMAT(clicked_at, '%Y-%m-%d %H:00:00')
          ORDER BY hour ASC
        `;
        
        return await db.query(query, [urlId, hours]);
      },
      300
    );
  }

  async getTopReferrers(urlId,limit=10){
      const cacheKey = `analytics:referrers:${urlId}:${limit}`;

      return await cacheService.cacheAside(
        cacheKey,
        async()=>{
            const query=`SELECT COALESCE(NULLIF(referrer_url,''),'Direct') as referrer,COUNT(*) as clicks FROM click_events WHERE url_id=? GROUP BY referrer_url ORDER BY clicks DESC LIMIT ?`;

            return await db.query(query,[urlId,limit]);
        },
        600
      )
  }

  async getBrowserStats(urlId){
    const cacheKey = `analytics:browsers:${urlId}`;
    return await cacheService.cacheAside(
        cacheKey,
        async()=>{
            const query=`SELECT browser,COUNT(*) as count FROM click_events WHERE url_id=? AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC`;
            return await db.query(query,[urlId]);
        },
        1800
    )
  }


   async invalidateAnalyticsCache(urlId) {
    const pattern = `analytics:*:${urlId}:*`;
    const deleted = await cacheService.invalidatePattern(pattern);
    logger.debug(`Invalidated ${deleted} analytics cache keys for URL ${urlId}`);
  }

  async getRealtimeCount(urlId) {
    const counterKey = `analytics:realtime:${urlId}`;
    const count = await redis.get(counterKey);
    return count ? parseInt(count) : 0;
  }

  async incrementalRealtimeCounter(urlId){
    const counterKey=`analytics:realtime:${urlId}`;
    await redis.increment(counterKey);
    await redis.expire(counterKey,60);
  }

}