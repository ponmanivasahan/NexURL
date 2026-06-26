const db=require('../config/db');
const cacheService=require('./cacheService');
const logger=require('../utils/logger');
const { redis } = require('../config');

class AnalyticsService{
    async getClickCount(urlId,period='all'){
        const cacheKey=`analytics:clicks:${urlId}:${period}`;

        return await cacheService.cacheAside(
            cacheKey,async()=>{
                let query;
                let params=[urlId];

                switch(period){
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

  /**
   * Record click event via queue (async, non-blocking)
   */
  async recordClickAsync(clickData) {
    try {
      const queueManager = require('../config/queue');

      await queueManager.addJob(
        'analytics',
        'record-click',
        {
          urlId: clickData.urlId,
          shortCode: clickData.shortCode,
          ipAddress: clickData.ipAddress,
          userAgent: clickData.userAgent,
          referrer: clickData.referrer,
          country: clickData.country || this.getCountryFromIP(clickData.ipAddress),
          browser: clickData.browser || this.parseBrowser(clickData.userAgent),
          os: clickData.os || this.parseOS(clickData.userAgent),
          deviceType: clickData.deviceType || this.parseDevice(clickData.userAgent),
          originalUrl: clickData.originalUrl
        },
        {
          priority: this.getJobPriority(clickData)
        }
      );

      return true;
    } catch (error) {
      logger.error('Failed to queue click event:', error);
      // Fallback: store directly if queue fails
      return await this.recordClickSync(clickData);
    }
  }

  /**
   * Fallback: Record click synchronously (if queue fails)
   */
  async recordClickSync(clickData) {
    try {
      await db.query(
        `INSERT INTO click_events (url_id, ip_address, user_agent, referrer_url, country, browser, os, device_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clickData.urlId,
          clickData.ipAddress,
          clickData.userAgent,
          clickData.referrer,
          clickData.country || this.getCountryFromIP(clickData.ipAddress),
          clickData.browser || this.parseBrowser(clickData.userAgent),
          clickData.os || this.parseOS(clickData.userAgent),
          clickData.deviceType || this.parseDevice(clickData.userAgent)
        ]
      );
      return true;
    } catch (error) {
      logger.error('Sync click recording failed:', error);
      return false;
    }
  }

  /**
   * Backward-compatible alias used by redirect service.
   */
  async recordClick(clickData) {
    return await this.recordClickAsync(clickData);
  }

  /**
   * Determine job priority based on URL popularity.
   */
  getJobPriority(clickData) {
    if (clickData.isPopular) return 1;
    if (clickData.isNew) return 5;
    return 10;
  }

  /**
   * Batch record click events (for bulk operations)
   */
  async recordClicksBatch(clicks) {
    try {
      const queueManager = require('../config/queue');

      const jobs = clicks.map((click) => ({
        name: 'record-click',
        data: {
          ...click,
          timestamp: new Date()
        }
      }));

      await queueManager.addBulkJobs('analytics', jobs);
      return true;
    } catch (error) {
      logger.error('Batch click recording failed:', error);
      return false;
    }
  }

  getCountryFromIP(ipAddress) {
    if (!ipAddress) return 'Unknown';
    return 'Unknown';
  }

  parseBrowser(userAgent) {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();

    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';

    return 'Other';
  }

  parseOS(userAgent) {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
    if (ua.includes('linux')) return 'Linux';

    return 'Other';
  }

  parseDevice(userAgent) {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();

    if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) return 'Mobile';
    return 'Desktop';
  }

}

module.exports = new AnalyticsService();