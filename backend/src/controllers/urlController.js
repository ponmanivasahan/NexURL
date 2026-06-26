const UrlShortnerService=require('../services/urlShortner');
const ApiResponse=require('../utils/response')
const {AppError}=require('../middleware/errorHandler');
const db = require('../config/db');
const analyticsService = require('../services/analyticsService');

class UrlController{
    async createShortUrl(req,res,next){
        try{
        const {url,customAlias,expiresAt}=req.body;
        const userId=req.user?.id;
        const result=await UrlShortnerService.createShortUrl(url,{
            userId,customAlias,expiresAt:expiresAt ? new Date(expiresAt) : null
        })

        return ApiResponse.created(res,{
            shortUrl:`${process.env.BASE_URL}/${result.shortCode}`,
            originalUrl:result.originalUrl,
            shortCode:result.shortCode,
            isCustom:result.isCustom,
            createdAt:result.createdAt,
            expiresAt:result.expiresAt
        },'URL shortened successfully');
        }
        catch(error){
          next (error);
        }
    }

    async getUserUrls(req,res,next){
        try{
          const userId=req.user.id;
          const {page=1,limit=10}=req.query;

          const result=await UrlShortnerService.getUserUrls(
            userId,parseInt(page),parseInt(limit)
          );
          
          return ApiResponse.paginated(
            res,result.urls.map(url=>({...url,shortUrl:`${process.env.BASE_URL}/${url.shortCode}`})),
            result.pagination
          )
        }
        catch(error){
          next(error);
        }
    }


    async deleteUrl(req,res,next){
        try{
          const {shortCode}=req.params;
          const userId=req.user.id;

          await UrlShortnerService.deleteUrl(shortCode,userId);

          return ApiResponse.success(res,null,'URL deleted successfully')
        }
        catch(error){
          next(error);
        }
    }

    async getUrlAnalytics(req,res,next){
      try {
        const {shortCode}=req.params;
        const userId = req.user.id;

        const [url] = await db.query(
          'SELECT id, original_url, short_code, user_id, created_at, expires_at, is_active FROM urls WHERE short_code = ?',
          [shortCode]
        );
        if (!url) {
          throw new AppError('URL not found', 404);
        }
        if (url.user_id !== userId) {
          throw new AppError('Not Authorized to view analytics for this URL', 403);
        }

        const urlId = url.id;

        // Fetch click counts
        const totalClicks = await analyticsService.getClickCount(urlId, 'all');

        // Fetch unique visitors (by distinct ip_address)
        const [uniqueResult] = await db.query(
          'SELECT COUNT(DISTINCT ip_address) as count FROM click_events WHERE url_id = ?',
          [urlId]
        );
        const uniqueVisitors = uniqueResult ? uniqueResult.count : 0;

        // Fetch hourly timeline (last 24 hours)
        const timeline = await analyticsService.getHourlyAnalytics(urlId, 24);

        // Fetch referrers
        const referrers = await analyticsService.getTopReferrers(urlId, 10);

        // Fetch browsers
        const browsers = await analyticsService.getBrowserStats(urlId);

        // Fetch OS stats
        const os = await db.query(
          'SELECT COALESCE(os, "Unknown") as os, COUNT(*) as count FROM click_events WHERE url_id = ? GROUP BY os ORDER BY count DESC',
          [urlId]
        );

        // Fetch device stats
        const devices = await db.query(
          'SELECT COALESCE(device_type, "Unknown") as device, COUNT(*) as count FROM click_events WHERE url_id = ? GROUP BY device_type ORDER BY count DESC',
          [urlId]
        );

        return ApiResponse.success(res, {
          shortCode: url.short_code,
          originalUrl: url.original_url,
          createdAt: url.created_at,
          expiresAt: url.expires_at,
          isActive: url.is_active,
          metrics: {
            totalClicks,
            uniqueVisitors,
            timeline,
            referrers,
            browsers,
            os,
            devices
          }
        }, 'URL analytics fetched successfully');
      } catch (error) {
        next(error);
      }
    }
}

module.exports=new UrlController();