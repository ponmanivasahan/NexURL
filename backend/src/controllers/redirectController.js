const urlShortnerService = require('../services/urlShortner');
const redirectService = require('../services/redirectService');
const cacheService = require('../services/cacheService');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

class RedirectController {

  async redirect(req, res, next) {
    const startTime = process.hrtime();
    
    try {
      const { shortCode } = req.params;

      if (!shortCode || shortCode.length > 30) {
        return this.sendErrorResponse(res, 404, 'Short URL not found');
      }

      const url = await urlShortnerService.findByShortCodeOptimized(shortCode);

      if (!url) {
        return this.sendErrorResponse(res, 404, 'Short URL not found');
      }

      if (url.expires_at && new Date(url.expires_at) < new Date()) {
        return redirectService.handleExpiredUrl(res, url);
      }

      const redirectConfig = redirectService.determineRedirectStrategy(url, req);

      let destinationUrl = url.originalUrl || url.original_url;
      if (url.geo_routing_enabled) {
        const country = req.headers['cf-ipcountry'] || 'US';
        destinationUrl = redirectService.getGeoRedirectUrl(url, country);
      }

      const analyticsData = {
        urlId: url.id,
        shortCode: shortCode,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        referrer: req.get('referer'),
        redirectType: redirectConfig.statusCode,
        fromCache: url.fromCache || false,
        requestId: req.requestId
      };

      return await redirectService.executeRedirect(
        res,
        destinationUrl,
        redirectConfig,
        analyticsData
      );

    } catch (error) {
      logger.error('Redirect error:', error);
      return this.sendErrorResponse(res, 500, 'Internal server error');
    } finally {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;
      
      if (responseTime > 100) {
        logger.warn(`Slow redirect: ${responseTime}ms for ${req.params.shortCode}`);
      }
    }
  }


  async previewRedirect(req, res, next) {
    try {
      const { shortCode } = req.params;
      
      const url = await urlShortnerService.findByShortCodeOptimized(shortCode);
      
      if (!url) {
        return this.sendErrorResponse(res, 404, 'Short URL not found');
      }

      if (url.expires_at && new Date(url.expires_at) < new Date()) {
        return redirectService.handleExpiredUrl(res, url);
      }

      const config = redirectService.getRedirectConfig(
        redirectService.REDIRECT_TYPES.TEMPORARY
      );

      return await redirectService.previewRedirect(res, url, config);

    } catch (error) {
      logger.error('Preview redirect error:', error);
      return this.sendErrorResponse(res, 500, 'Internal server error');
    }
  }

  async getRedirectInfo(req, res, next) {
    try {
      const { shortCode } = req.params;
      
      const url = await urlShortnerService.findByShortCodeOptimized(shortCode);
      
      if (!url) {
        return res.status(404).json({
          success: false,
          message: 'Short URL not found'
        });
      }

      const redirectConfig = redirectService.determineRedirectStrategy(url, req);

      return res.json({
        success: true,
        data: {
          shortCode: url.short_code,
          destinationUrl: url.original_url,
          redirectType: redirectConfig.statusCode,
          redirectMessage: redirectConfig.statusMessage,
          isActive: url.is_active,
          expiresAt: url.expires_at,
          createdAt: url.created_at,
          clickCount: await analyticsService.getClickCount(url.id)
        }
      });

    } catch (error) {
      logger.error('Get redirect info error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }


  sendErrorResponse(res, statusCode, message) {
    const acceptHeader = res.req.get('accept') || '';
    
    if (acceptHeader.includes('text/html')) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${statusCode} - ${message}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            h1 { 
              color: ${statusCode === 404 ? '#e53e3e' : '#666'};
              font-size: 4rem;
              margin: 0;
            }
            p { color: #666; font-size: 1.2rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${statusCode}</h1>
            <p>${message}</p>
          </div>
        </body>
        </html>
      `;
      return res.status(statusCode).send(html);
    } else {
      return res.status(statusCode).json({
        success: false,
        message: message
      });
    }
  }
}

module.exports = new RedirectController();