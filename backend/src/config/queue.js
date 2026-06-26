const { Queue, Worker } = require('bullmq');
const redis = require('./redis');
const logger = require('../utils/logger');

// Suppress BullMQ's eviction policy warning which spams the console for cloud Redis instances
const originalWarn = console.warn;
console.warn = function(...args) {
  if (typeof args[0] === 'string' && args[0].includes('Eviction policy is')) {
    return;
  }
  originalWarn.apply(console, args);
};

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.schedulers = new Map();
    
    this.connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      username: process.env.REDIS_USER || undefined,
      password: process.env.REDIS_PASSWORD || undefined
    };

    this.queueConfigs = {
      analytics: {
        name: 'analytics',
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: {
          age: 3600, 
          count: 1000 
        },
        removeOnFail: {
          age: 24 * 3600 
        }
      },

       clickAggregation: {
        name: 'click-aggregation',
        attempts: 5,
        backoff: {
          type: 'fixed',
          delay: 5000
        },
        repeat: {
          pattern: '*/5 * * * *' 
        }
      },

      notifications: {
        name: 'notifications',
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      },

      cleanup: {
        name: 'cleanup',
        attempts: 1,
        repeat: {
          pattern: '0 2 * * *'
        }
      },

      cacheWarming: {
        name: 'cache-warming',
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 10000
        }
      }
    };
  }

 
  async initialize() {
    try {
      for (const [key, config] of Object.entries(this.queueConfigs)) {
        await this.createQueue(key, config);
      }

      await this.startWorkers();

      logger.info('✅ Queue system initialized successfully');
    } catch (error) {
      logger.error('❌ Queue initialization failed:', error);
      throw error;
    }
  }


  async createQueue(queueKey, config) {
    const queue = new Queue(config.name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: config.attempts,
        backoff: config.backoff,
        removeOnComplete: config.removeOnComplete,
        removeOnFail: config.removeOnFail
      }
    });

    this.queues.set(queueKey, queue);
    logger.info(`Queue created: ${config.name}`);
    return queue;
  }


  getQueue(queueKey) {
    const queue = this.queues.get(queueKey);
    if (!queue) {
      throw new Error(`Queue '${queueKey}' not found`);
    }
    return queue;
  }


  async addJob(queueKey, jobName, data, options = {}) {
    try {
      const queue = this.getQueue(queueKey);
      
      const job = await queue.add(jobName, data, {
        ...options,
        timestamp: Date.now()
      });

      logger.debug(`Job added to ${queueKey}: ${job.id} - ${jobName}`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job to ${queueKey}:`, error);
      throw error;
    }
  }

 
  async addBulkJobs(queueKey, jobs) {
    try {
      const queue = this.getQueue(queueKey);
      
      const jobPromises = jobs.map(({ name, data, options }) =>
        queue.add(name, data, options)
      );

      const results = await Promise.all(jobPromises);
      logger.debug(`Added ${results.length} bulk jobs to ${queueKey}`);
      return results;
    } catch (error) {
      logger.error(`Failed to add bulk jobs to ${queueKey}:`, error);
      throw error;
    }
  }

 
  async startWorkers() {
    this.startAnalyticsWorker();
    
    this.startClickAggregationWorker();
    
    this.startNotificationWorker();
    
    this.startCleanupWorker();
    
    this.startCacheWarmingWorker();
  }

 
  startAnalyticsWorker() {
    const worker = new Worker(
      'analytics',
      async (job) => {
        return await this.processAnalyticsJob(job);
      },
      {
        connection: this.connection,
        concurrency: 10, 
        limiter: {
          max: 100,      
          duration: 1000 
        }
      }
    );

    worker.on('completed', (job) => {
      logger.debug(`Analytics job completed: ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Analytics job failed: ${job.id}`, error);
    });

    worker.on('error', (error) => {
      logger.error('Analytics worker error:', error);
    });

    this.workers.set('analytics', worker);
    logger.info('Analytics worker started');
  }

 
  async processAnalyticsJob(job) {
    const { urlId, shortCode, ipAddress, userAgent, referrer, country, browser, os, deviceType } = job.data;
    
    try {
      const db = require('./db');
      await db.query(
        `INSERT INTO click_events (
          url_id, ip_address, user_agent, referrer_url, 
          country, browser, os, device_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [urlId, ipAddress, userAgent, referrer, country, browser, os, deviceType]
      );

      const cacheService = require('../services/cacheService');
      const analyticsService = require('../services/analyticsService');
      await analyticsService.incrementRealtimeCounter(urlId);

      await cacheService.trackPopularUrl(shortCode, job.data.originalUrl);

      return { success: true, urlId };
    } catch (error) {
      logger.error(`Failed to process analytics job ${job.id}:`, error);
      throw error;
    }
  }


  startClickAggregationWorker() {
    const worker = new Worker(
      'click-aggregation',
      async (job) => {
        return await this.processClickAggregation(job);
      },
      {
        connection: this.connection,
        concurrency: 1 
      }
    );

    worker.on('completed', (job) => {
      logger.info(`Click aggregation completed: ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Click aggregation failed: ${job.id}`, error);
    });

    this.workers.set('clickAggregation', worker);
    logger.info('Click aggregation worker started');
  }

  
  async processClickAggregation(job) {
    const db = require('./db');
    
    try {
      await db.query(`
        INSERT INTO analytics_hourly (url_id, hour_bucket, click_count, unique_visitors)
        SELECT 
          url_id,
          DATE_FORMAT(clicked_at, '%Y-%m-%d %H:00:00') as hour_bucket,
          COUNT(*) as click_count,
          COUNT(DISTINCT ip_address) as unique_visitors
        FROM click_events
        WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY url_id, hour_bucket
        ON DUPLICATE KEY UPDATE
          click_count = VALUES(click_count),
          unique_visitors = VALUES(unique_visitors)
      `);

      await db.query(`
        INSERT INTO analytics_daily (url_id, date_bucket, click_count, unique_visitors)
        SELECT 
          url_id,
          DATE(clicked_at) as date_bucket,
          COUNT(*) as click_count,
          COUNT(DISTINCT ip_address) as unique_visitors
        FROM click_events
        WHERE clicked_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        GROUP BY url_id, date_bucket
        ON DUPLICATE KEY UPDATE
          click_count = VALUES(click_count),
          unique_visitors = VALUES(unique_visitors)
      `);

      const analyticsService = require('../services/analyticsService');
      const [urls] = await db.query(`
        SELECT DISTINCT url_id 
        FROM click_events 
        WHERE clicked_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `);
      
      for (const url of urls) {
        await analyticsService.invalidateAnalyticsCache(url.url_id);
      }

      return { success: true, aggregated: urls.length };
    } catch (error) {
      logger.error('Click aggregation failed:', error);
      throw error;
    }
  }


  startNotificationWorker() {
    const worker = new Worker(
      'notifications',
      async (job) => {
        return await this.processNotificationJob(job);
      },
      {
        connection: this.connection,
        concurrency: 5
      }
    );

    worker.on('completed', (job) => {
      logger.info(`Notification sent: ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Notification failed: ${job.id}`, error);
    });

    this.workers.set('notifications', worker);
    logger.info('Notification worker started');
  }


  async processNotificationJob(job) {
    const { type, userId, data } = job.data;
    
    try {
      switch (type) {
        case 'url_created':
          logger.info(`Sending URL creation notification to user ${userId}`);
          break;
        case 'url_expiring':
          logger.info(`Sending expiration warning to user ${userId}`);
          break;
        case 'weekly_report':
          logger.info(`Sending weekly report to user ${userId}`);
          break;
        default:
          logger.warn(`Unknown notification type: ${type}`);
      }

      return { success: true, type };
    } catch (error) {
      logger.error('Notification processing failed:', error);
      throw error;
    }
  }


  startCleanupWorker() {
    const worker = new Worker(
      'cleanup',
      async (job) => {
        return await this.processCleanupJob(job);
      },
      {
        connection: this.connection,
        concurrency: 1
      }
    );

    this.workers.set('cleanup', worker);
    logger.info('Cleanup worker started');
  }


  async processCleanupJob(job) {
    const db = require('./db');
    
    try {
      const [result] = await db.query(`
        UPDATE urls 
        SET is_active = FALSE 
        WHERE expires_at IS NOT NULL 
        AND expires_at < NOW() 
        AND is_active = TRUE
      `);

      await db.query(`
        DELETE FROM click_events 
        WHERE clicked_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        LIMIT 10000
      `);

      logger.info(`Cleanup completed: ${result.affectedRows} URLs expired`);
      return { success: true, expiredUrls: result.affectedRows };
    } catch (error) {
      logger.error('Cleanup failed:', error);
      throw error;
    }
  }


  startCacheWarmingWorker() {
    const worker = new Worker(
      'cache-warming',
      async (job) => {
        return await this.processCacheWarming(job);
      },
      {
        connection: this.connection,
        concurrency: 1
      }
    );

    this.workers.set('cacheWarming', worker);
    logger.info('Cache warming worker started');
  }


  async processCacheWarming(job) {
    try {
      const urlShortenerService = require('../services/urlShortener');
      await urlShortenerService.preloadPopularUrls();
      return { success: true };
    } catch (error) {
      logger.error('Cache warming failed:', error);
      throw error;
    }
  }



  async getQueueStats() {
    const stats = {};
    
    for (const [key, queue] of this.queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);

      stats[key] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    }

    return stats;
  }


  async shutdown() {
    logger.info('Shutting down queue system...');
    
    for (const [key, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker closed: ${key}`);
    }
    for (const [key, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue closed: ${key}`);
    }

    logger.info('Queue system shutdown complete');
  }
}

const queueManager = new QueueManager();

module.exports = queueManager;