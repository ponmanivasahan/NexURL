const cacheService=require('../services/cacheService');
const db=require('../config/db');
const ApiResponse=require('../utils/response');

class MonitoringController{
    async getCacheStats(req, res, next) {
    try {
      const stats = await cacheService.getStats();
      const [dbStats] = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM urls) as total_urls,
          (SELECT COUNT(*) FROM click_events) as total_clicks,
          (SELECT COUNT(*) FROM users) as total_users
      `);

      return ApiResponse.success(res, {
        cache: stats,
        database: dbStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  async preloadCache(req,res,next){
    try{
      const urlShortnerService = require('../services/urlShortner');
      await urlShortnerService.preloadPopularUrls();
      
      return ApiResponse.success(res, null, 'Cache preloaded successfully');
    }
    catch(error){
        next(error);
    }
  }

  async clearCache(req, res, next) {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        return ApiResponse.badRequest(res, 'Pattern is required');
      }

      const deleted = await cacheService.invalidatePattern(pattern);
      
      return ApiResponse.success(res, { deleted }, `Cleared ${deleted} cache entries`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MonitoringController();