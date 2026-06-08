const UrlShortnerService=require('../services/urlShortner');
const {AppError}=require('../middleware/errorHandler');
const { error } = require('../utils/response');
const analyticsService=require('../services/analyticsService');
const cacheService=require('../services/cacheService');

class RedirectController{
    async redirect(req,res,next){
        const startTime=process.hrtime();

        try {
            const {shortCode}=req.params;
            if(!shortCode || shortCode.length>30){
                return res.status(404).json({error:'Short URL not found'});
            }

            const url=await UrlShortnerService.findByShortCode(shortCode);

            if(!url){
                return res.status(404).json({error:'Short URL not found'});
            }

            const[seconds,nanoseconds]=process.hrtime(startTime);
            const responseTime=seconds*1000+nanoseconds/100000;

            this.logAnalyticsAsync(url,req,responseTime);
            return res.redirect(302,url.originalUrl || url.originalUrl);
        }
        catch(error){
            console.error('Redirect error:',error.message);
            return res.status(500).json({error:'Internal server error'})
        }
    }

    trackAnalytics(url, req, responseTime) {
    setImmediate(async () => {
      try {
        const analyticsData = {
          urlId: url.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          referrerUrl: req.get('referer'),
          responseTime,
          timestamp: new Date()
        };
        if (analyticsData.userAgent) {
          const ua = this.parseUserAgent(analyticsData.userAgent);
          analyticsData.browser = ua.browser;
          analyticsData.os = ua.os;
          analyticsData.deviceType = ua.device;
        }
        await this.storeClickEvent(analyticsData);
        await analyticsService.incrementRealtimeCounter(url.id);
        
        await cacheService.trackPopularUrl(
          url.short_code || url.shortCode,
          url.originalUrl || url.original_url
        );

      } catch (error) {
        logger.error('Analytics tracking error:', error);
      }
    });
  }

  async storeClickEvent(data, retries = 3) {
    const query = `
      INSERT INTO click_events (
        url_id, ip_address, user_agent, referrer_url,
        browser, os, device_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.urlId,
      data.ipAddress,
      data.userAgent,
      data.referrerUrl,
      data.browser,
      data.os,
      data.deviceType
    ];

    for (let i = 0; i < retries; i++) {
      try {
        await db.query(query, params);
        return;
      } catch (error) {
        if (i === retries - 1) {
          logger.error('Failed to store click event after retries:', error);
        }
        await this.sleep(100 * Math.pow(2, i)); // Exponential backoff
      }
    }
  }


  parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';
    
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone')) os = 'iOS';
    
    let device = 'Desktop';
    if (ua.includes('mobile')) device = 'Mobile';
    else if (ua.includes('tablet')) device = 'Tablet';
    
    return { browser, os, device };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports=new RedirectController();