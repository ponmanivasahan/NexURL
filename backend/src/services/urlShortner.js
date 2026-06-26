const base62=require('../utils/base62');
const {snowflake}=require('../utils/snowflake');
const db=require('../config/db');
const redis=require('../config/redis');
const cacheService=require('../services/cacheService');
const {AppError}=require('../middleware/errorHandler');

class UrlShortnerService{
    constructor(){
        this.SHORT_CODE_LENGTH=parseInt(process.env.SHORT_CODE_LENGTH);
        this.RESERVED_WORDS=new Set([
            'api','admin','login','logout','register','health','status','dashboard',
            'analytics','short','url','link','redirect','go'
        ])
    }

     /**
   * Create a short URL
   * This is the main business logic for URL shortening
   * 
   * @param {string} originalUrl - The long URL to shorten
   * @param {object} options - Additional options
   * @returns {object} Created URL object
   */

    async createShortUrl(originalUrl,options={}){
        const{ userId=null,customAlias=null,expiresAt=null}=options;
        this.validateUrl(originalUrl);

        if(customAlias){
            return await this.createCustomAlias(originalUrl,customAlias,userId,expiresAt)
        }

        const shortCode=await this.generateUniqueCode();

        const url=await this.saveUrl({originalUrl,shortCode,userId,expiresAt,isCustom: false})
        await this.cacheUrl(shortCode,originalUrl);
        return url;
     }
     /**
   * Generate a unique short code
   * Uses Snowflake ID + Base62 encoding
   * 
   * Why this approach?
   * - Snowflake guarantees unique ID
   * - Base62 makes it short and URL-safe
   * - No database lookup needed to verify uniqueness
   * 
   * @returns {string} Unique short code
   */
  async generateUniqueCode(){
    try{
      const id=await snowflake.nextId();
      let shortCode=base62.encodeWithPadding(id,this.SHORT_CODE_LENGTH);
      if(this.RESERVED_WORDS.has(shortCode.toLowerCase())){
        return await this.generateUniqueCode();
      }
      return shortCode;
    }
    catch(error){
    console.error('Error generating unique code:',error);
    throw new AppError('Failed to generate unique code',500);
    }
  }

   /**
   * Create a custom alias
   * @param {string} originalUrl - Original URL
   * @param {string} alias - Custom alias
   * @param {number} userId - User ID
   * @param {Date} expiresAt - Expiration date
   * @returns {object} Created URL object
   */
  
   async createCustomAlias(originalUrl,alias,userId,expiresAt){
      this.validateCustomAlias(alias);

      //check if alias already exists
      const existing=await this.findByShortCode(alias);
      if(existing){
        throw new AppError('Custom alias already taken',409);
      }

      if(this.RESERVED_WORDS.has(alias.toLowerCase())){
        throw new AppError('This alias is reserved',400);
      }

      const url=await this.saveUrl({
        originalUrl,shortCode:alias,userId,expiresAt,isCustom:true,customAlias:alias
      })
      await this.cacheUrl(alias,originalUrl)
      return url;
   }


   /**
   * Save URL to database
   * @param {object} urlData - URL data
   * @returns {object} Saved URL object
   */

   async saveUrl(urlData){
    const{
      originalUrl,shortCode,userId,expiresAt,isCustom,customAlias
    }=urlData;

    const query=`INSERT INTO urls(
    original_url,short_code,user_id,expires_at,is_custom,custom_alias,is_active
    ) VALUES(?,?,?,?,?,?,TRUE)`;

    const params=[originalUrl,shortCode,userId|| null, expiresAt||null, isCustom ? 1 : 0, customAlias || null]

    try{
      const result=await db.query(query,params);

      return{ id:result.insertId,originalUrl,shortCode,userId,expiresAt,isCustom,customAlias,createdAt:new Date()}
    }
    catch(error){
      console.error('Error saving URL:',error);
      throw new AppError('Failed to save URL',500);
    }
   }

   async findByShortCode(shortCode){
    const cached=await this.getCachedUrl(shortCode);
    if(cached){
      return {originalUrl:cached, fromCache:true};
    }

    const query=`SELECT id,original_url,short_code,user_id,is_active,expires_at,is_custom,custom_alias,created_at,updated_at 
    FROM urls WHERE short_code=? AND is_active=TRUE AND (expires_at IS NULL OR expires_at>NOW())`

    try{
      const [url]=await db.query(query,[shortCode])

      if(url){
        await this.cacheUrl(shortCode,url.original_url);
        return url;
      }
      return null;
    }
    catch(error){
        console.error('Error finding URL:', error);
        throw new AppError('Failed to lookup URL',500);
    }
   }

   async cacheUrl(shortCode,originalUrl){
    try{
       await redis.set(
        `url:${shortCode}`,
        originalUrl,
        86400
       )
    }
    catch(error){
       console.error('Error caching URL:',error);
    }
   }

   async getCachedUrl(shortCode){
    try{
      return await redis.get(`url:${shortCode}`)
    }
    catch(error){
      console.error('Error getting cached Url:', error)
      return null;
    }
   }

   validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new AppError('URL is required', 400);
    }

    // Basic URL validation
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new AppError('Only HTTP and HTTPS URLs are allowed', 400);
      }

      // Check minimum length
      if (url.length < 10) {
        throw new AppError('URL is too short', 400);
      }

      // Check maximum length (prevent extremely long URLs)
      if (url.length > 2048) {
        throw new AppError('URL is too long (max 2048 characters)', 400);
      }

      // Basic malicious URL check
      if (this.isMaliciousUrl(url)) {
        throw new AppError('This URL appears to be malicious', 400);
      }

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid URL format', 400);
    }
  }
  validateCustomAlias(alias) {
    if (!alias || typeof alias !== 'string') {
      throw new AppError('Custom alias is required', 400);
    }

    // Length constraints
    if (alias.length < 4) {
      throw new AppError('Custom alias must be at least 4 characters', 400);
    }

    if (alias.length > 30) {
      throw new AppError('Custom alias must be less than 30 characters', 400);
    }

    // Allowed characters (alphanumeric, hyphens, underscores)
    const aliasRegex = /^[a-zA-Z0-9_-]+$/;
    if (!aliasRegex.test(alias)) {
      throw new AppError('Custom alias can only contain letters, numbers, hyphens, and underscores', 400);
    }

    // Prevent common patterns
    if (alias.startsWith('-') || alias.startsWith('_')) {
      throw new AppError('Custom alias cannot start with hyphens or underscores', 400);
    }
  }

  isMaliciousUrl(url){
    const lowerUrl=url.toLowerCase();
    const suspiciousPatterns=['javascript:','data','vbscript:','file://','127.0.0.1','localhost','[::1]']

    return suspiciousPatterns.some(pattern=>lowerUrl.includes(pattern))
  }
  async getUserUrls(userId,page=1,limit=10){
    const offset=(page-1)*limit;
    const query=`
      SELECT u.id, u.original_url as originalUrl, u.short_code as shortCode, 
             u.custom_alias as customAlias, u.is_custom as isCustom, 
             u.is_active as isActive, u.expires_at as expiresAt, u.created_at as createdAt,
             COUNT(c.id) as clicks
      FROM urls u
      LEFT JOIN click_events c ON u.id = c.url_id
      WHERE u.user_id = ?
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery=`SELECT COUNT(*) as total FROM urls WHERE user_id=?`;

    try{
      const [urls,[countResult]]=await Promise.all([
        db.query(query,[userId,limit,offset]),
        db.query(countQuery,[userId])
      ]);

      return { urls,pagination:{
        page,limit,total:countResult.total,
        pages:Math.ceil(countResult.total/limit)
      }}
    }
    catch(error){
        console.error('Error fetching user URLs:',error);
        throw new AppError('Failed to fetch URLs',500);
    }
  }
  //delete a url
  async deleteUrl(shortCode,userId){
    const url=await db.query(
      'SELECT id,user_id FROM urls WHERE short_code=?',[shortCode]
    );

    if(!url.length){
      throw new AppError('URL not found',404);
    }

    if(url[0].user_id !==userId){
      throw new AppError('Not Authorized to delete this URL',403)
    }
    await db.query(
      'DELETE FROM urls WHERE short_code=?',[shortCode]
    );
    await redis.del(`url:${shortCode}`);
  }


  async findByShortCodeOptimized(shortCode){
    const cacheKey=`url:${shortCode}`;
    return await cacheService.cacheAsideWithLock(
    cacheKey,
    async () => {
      const query = `
        SELECT id, original_url, short_code, user_id, 
               is_active, expires_at
        FROM urls 
        WHERE short_code = ? 
        AND is_active = TRUE 
        AND (expires_at IS NULL OR expires_at > NOW())
      `;
      
      const [url] = await db.query(query, [shortCode]);
      
      if (url) {
        await cacheService.trackPopularUrl(shortCode, url.original_url);
        return url;
      }
      
      return null;
    },
    cacheService.TTL.REDIRECT
  );
  }

  async preloadPopularUrls(){
    try {
      const query=`
      SELECT u.short_code,u.original_url,COUNT(*) as clicks FROM urls u
      JOIN click_events cr ON u.id=cr.url_id
      WHERE cr.clicked_at>=DATE_SUB(NOW(),INTERVAL 24 HOUR)
      AND u.is_active=TRUE
      GROUP BY u.id ORDER BY clicks DESC LIMIT 1000`;

      const popularUrls=await db.query(query);

      if (popularUrls.length > 0) {
      await cacheService.preloadCache(
        popularUrls.map(url => ({
          shortCode: url.short_code,
          originalUrl: url.original_url
        }))
      );
      console.log(`Preloaded ${popularUrls.length} popular URLs into cache`)
    }
    } catch (error) {
        console.error('Error preloading popular URLs:', error);
    }
  }
}

const urlShortnerService = new UrlShortnerService();
module.exports = urlShortnerService;