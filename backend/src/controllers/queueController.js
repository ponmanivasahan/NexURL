const queueManager = require('../config/queue');
const ApiResponse = require('../utils/response');

class QueueController {

  async getQueueStats(req, res, next) {
    try {
      const stats = await queueManager.getQueueStats();
      
      return ApiResponse.success(res, {
        queues: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueueDetails(req, res, next) {
    try {
      const { queueName } = req.params;
      const queue = queueManager.getQueue(queueName);
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);

      const recentJobs = await queue.getJobs(['completed', 'failed'], 0, 9);

      return ApiResponse.success(res, {
        name: queueName,
        counts: { waiting, active, completed, failed, delayed },
        recentJobs: recentJobs.map(job => ({
          id: job.id,
          name: job.name,
          status: job.finishedOn ? 'completed' : 'failed',
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attempts: job.attemptsMade,
          failedReason: job.failedReason
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  async retryFailedJobs(req, res, next) {
    try {
      const { queueName } = req.params;
      const queue = queueManager.getQueue(queueName);
      
      const failedJobs = await queue.getJobs(['failed']);
      let retried = 0;

      for (const job of failedJobs) {
        await job.retry();
        retried++;
      }

      return ApiResponse.success(res, { retried }, `Retried ${retried} failed jobs`);
    } catch (error) {
      next(error);
    }
  }


  async cleanQueue(req, res, next) {
    try {
      const { queueName } = req.params;
      const queue = queueManager.getQueue(queueName);
      
      await queue.clean(0, 1000, 'completed');
      await queue.clean(0, 1000, 'failed');

      return ApiResponse.success(res, null, 'Queue cleaned successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QueueController();