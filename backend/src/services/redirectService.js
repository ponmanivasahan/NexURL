const urlShortnerService = require('./urlShortner');
const cacheService = require('./cacheService');
const analyticsService = require('./analyticsService');
const logger = require('../utils/logger');

class RedirectService {
  constructor() {
    this.REDIRECT_TYPES = {
      PERMANENT: 301,
      TEMPORARY: 302,
      SEE_OTHER: 303,
      TEMPORARY_REDIRECT: 307,
      PERMANENT_REDIRECT: 308
    };

    this.CACHE_TTL = {
      BROWSER_301: 365 * 24 * 60 * 60,
      BROWSER_302: 0,
      CDN: 60 * 60,
      REDIS: 24 * 60 * 60 
    };
  }

  determineRedirectStrategy(url, req) {
    if (url.redirect_type) {
      return this.getRedirectConfig(url.redirect_type);
    }

    if (url.is_permanent || url.link_type === 'canonical') {
      return this.getRedirectConfig(this.REDIRECT_TYPES.PERMANENT);
    }

    if (url.link_type === 'marketing' || url.link_type === 'tracked') {
      return this.getRedirectConfig(this.REDIRECT_TYPES.TEMPORARY);
    }

    if (url.track_clicks !== false) {
      return this.getRedirectConfig(this.REDIRECT_TYPES.TEMPORARY);
    }

    if (this.isBot(req.get('user-agent'))) {
      return this.getRedirectConfig(this.REDIRECT_TYPES.PERMANENT);
    }
    return this.getRedirectConfig(this.REDIRECT_TYPES.TEMPORARY);
  }

  getRedirectConfig(statusCode) {
    const configs = {
      301: {
        statusCode: 301,
        statusMessage: 'Moved Permanently',
        cacheControl: `public, max-age=${this.CACHE_TTL.BROWSER_301}`,
        browserCaching: true,
        analyticsTracking: false,
        seoPassThrough: true,
        mutable: false
      },
      302: {
        statusCode: 302,
        statusMessage: 'Found',
        cacheControl: 'no-cache, no-store, must-revalidate',
        browserCaching: false,
        analyticsTracking: true,
        seoPassThrough: false,
        mutable: true
      },
      303: {
        statusCode: 303,
        statusMessage: 'See Other',
        cacheControl: 'no-cache',
        browserCaching: false,
        analyticsTracking: true,
        seoPassThrough: false,
        mutable: true
      },
      307: {
        statusCode: 307,
        statusMessage: 'Temporary Redirect',
        cacheControl: 'no-cache, no-store, must-revalidate',
        browserCaching: false,
        analyticsTracking: true,
        seoPassThrough: false,
        mutable: true,
        preserveMethod: true
      },
      308: {
        statusCode: 308,
        statusMessage: 'Permanent Redirect',
        cacheControl: `public, max-age=${this.CACHE_TTL.BROWSER_301}`,
        browserCaching: true,
        analyticsTracking: false,
        seoPassThrough: true,
        mutable: false,
        preserveMethod: true
      }
    };

    return configs[statusCode] || configs[302];
  }

  async executeRedirect(res, destinationUrl, config, analyticsData) {
    this.setCacheHeaders(res, config);
    this.setSecurityHeaders(res, destinationUrl);
    this.setMonitoringHeaders(res, config, analyticsData);

    if (config.analyticsTracking) {
      await this.trackAnalytics(analyticsData);
    }

    this.logRedirect(analyticsData, config);

    if (config.preserveMethod) {
      res.set('Location', destinationUrl);
      return res.status(config.statusCode).send();
    } else {
      return res.redirect(config.statusCode, destinationUrl);
    }
  }

  setCacheHeaders(res, config) {
    res.set('Cache-Control', config.cacheControl);

    if (!config.browserCaching) {
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      const expiresDate = new Date();
      expiresDate.setFullYear(expiresDate.getFullYear() + 1);
      res.set('Expires', expiresDate.toUTCString());
    }

    res.set('Vary', 'Accept-Encoding, User-Agent');
  }

  setSecurityHeaders(res, destinationUrl) {
    try {
      const url = new URL(destinationUrl);
      
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      
    } catch (error) {
      logger.error('Security validation failed for redirect:', error);
      throw new Error('Invalid redirect destination');
    }
  }

  setMonitoringHeaders(res, config, analyticsData) {
    res.set('X-Redirect-Type', `${config.statusCode} ${config.statusMessage}`);
    
    res.set('X-Cache-Status', analyticsData.fromCache ? 'HIT' : 'MISS');
    
    if (analyticsData.requestId) {
      res.set('X-Request-ID', analyticsData.requestId);
    }

    res.set('X-Redirect-Service', 'url-shortener-v1');
  }

  async trackAnalytics(data) {
    // Fire and forget - do not block redirect responses.
    setImmediate(async () => {
      try {
        const analyticsData = {
          urlId: data.urlId,
          shortCode: data.shortCode,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referrer: data.referrer,
          responseTime: data.responseTime,
          originalUrl: data.originalUrl
        };

        if (analyticsData.userAgent) {
          const ua = analyticsData.userAgent.toLowerCase();

          if (ua.includes('chrome')) analyticsData.browser = 'Chrome';
          else if (ua.includes('firefox')) analyticsData.browser = 'Firefox';
          else if (ua.includes('safari')) analyticsData.browser = 'Safari';
          else analyticsData.browser = 'Other';

          if (ua.includes('windows')) analyticsData.os = 'Windows';
          else if (ua.includes('mac')) analyticsData.os = 'macOS';
          else if (ua.includes('linux')) analyticsData.os = 'Linux';
          else analyticsData.os = 'Other';

          if (ua.includes('mobile')) analyticsData.deviceType = 'Mobile';
          else if (ua.includes('tablet')) analyticsData.deviceType = 'Tablet';
          else analyticsData.deviceType = 'Desktop';
        }

        await analyticsService.recordClickAsync(analyticsData);
      } catch (error) {
        // Do not affect redirect flow if analytics fails.
        logger.error('Analytics queue error:', error);
      }
    });
  }

  logRedirect(data, config) {
    const logData = {
      shortCode: data.shortCode,
      redirectType: config.statusCode,
      fromCache: data.fromCache,
      userAgent: data.userAgent?.substring(0, 100),
      timestamp: new Date().toISOString()
    };

    if (config.statusCode === 301) {
      logger.info('Permanent redirect:', logData);
    } else {
      logger.debug('Temporary redirect:', logData);
    }
  }

  isBot(userAgent) {
    if (!userAgent) return false;

    const botPatterns = [
      'googlebot', 'bingbot', 'yandexbot', 'duckduckbot',
      'slurp', 'baiduspider', 'facebookexternalhit',
      'twitterbot', 'rogerbot', 'linkedinbot',
      'embedly', 'quora link preview', 'showyoubot',
      'outbrain', 'pinterest', 'slackbot',
      'vkshare', 'w3c_validator', 'redditbot',
      'applebot', 'whatsapp', 'flipboard',
      'tumblr', 'bitlybot', 'semrushbot',
      'ahrefsbot', 'mj12bot', 'dotbot'
    ];

    const lowerUA = userAgent.toLowerCase();
    return botPatterns.some(bot => lowerUA.includes(bot));
  }
  async previewRedirect(res, url, config) {
    const userAgent = res.req.get('user-agent') || '';
    const acceptHeader = res.req.get('accept') || '';
    
    if (acceptHeader.includes('text/html') && !this.isBot(userAgent)) {
      const previewHtml = this.generatePreviewPage(url);
      return res.send(previewHtml);
    }

    return this.executeRedirect(
      res,
      url.original_url,
      config,
      { urlId: url.id, shortCode: url.short_code }
    );
  }

  generatePreviewPage(url) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="3;url=${url.original_url}">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            text-align: center;
          }
          h1 { color: #333; margin-bottom: 1rem; }
          .url {
            background: #f5f5f5;
            padding: 1rem;
            border-radius: 0.5rem;
            word-break: break-all;
            margin: 1rem 0;
            font-family: monospace;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: bold;
            transition: background 0.2s;
          }
          .button:hover { background: #5a67d8; }
          .notice {
            color: #999;
            font-size: 0.875rem;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔗 Redirecting You</h1>
          <p>You are being redirected to:</p>
          <div class="url">${url.original_url}</div>
          <a href="${url.original_url}" class="button">Continue to Site</a>
          <p class="notice">Auto-redirecting in 3 seconds...</p>
          <p class="notice">Short link: ${process.env.BASE_URL}/${url.short_code}</p>
        </div>
      </body>
      </html>
    `;
  }


  handleExpiredUrl(res, url) {
    if (url.fallback_url) {
      return res.redirect(302, url.fallback_url);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Link Expired</title>
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
          h1 { color: #e53e3e; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⏰ Link Expired</h1>
          <p>This short link has expired and is no longer active.</p>
          ${url.expires_at ? `<p>Expired on: ${new Date(url.expires_at).toLocaleDateString()}</p>` : ''}
          <p>If you believe this is an error, please contact the link creator.</p>
        </div>
      </body>
      </html>
    `;

    return res.status(410).send(html);
  }

  getGeoRedirectUrl(url, country) {
    let geoRules = {};
    try {
      geoRules = url.geo_rules ? JSON.parse(url.geo_rules) : {};
    } catch (e) {
      return url.original_url;
    }

    if (geoRules[country]) {
      return geoRules[country];
    }

    const continent = this.getContinent(country);
    if (geoRules[`continent:${continent}`]) {
      return geoRules[`continent:${continent}`];
    }

    return geoRules['default'] || url.original_url;
  }

  getContinent(countryCode) {
    const continentMap = {
      'US': 'NA', 'CA': 'NA', 'MX': 'NA',
      'GB': 'EU', 'DE': 'EU', 'FR': 'EU', 'IT': 'EU', 'ES': 'EU',
      'JP': 'AS', 'CN': 'AS', 'IN': 'AS', 'KR': 'AS',
      'BR': 'SA', 'AR': 'SA',
      'AU': 'OC', 'NZ': 'OC',
      'ZA': 'AF', 'NG': 'AF', 'EG': 'AF'
    };
    return continentMap[countryCode] || 'OTHER';
  }
}

module.exports = new RedirectService();