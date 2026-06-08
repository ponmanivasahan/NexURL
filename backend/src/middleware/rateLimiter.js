const redis=require('../config/redis');
const {AppError}=require('./errorHandler');

//I am implementing token bucket algorithm using redis

const rateLimiter=(options={})=>{
    const{
        windowMs=15*60*1000,
        max=100,
        keyGenerator=null,
        skipSuccessfulRequests=false,
        message='Too many requests, please try again later'
    }=options;

    return async(req,res,next)=>{
        try{
            const key=keyGenerator ? keyGenerator(req) : `ratelimit:${req.ip}:${req.path}`;

            const current=await redis.increment(key);
            if(current===1){
                await redis.expire(key,Math.ceil(windowMs/1000));
            }

            const ttl=await redis.client.ttl(key);
            res.setHeader('X-RateLimit-Limit',max);
            res.setHeader('X-RateLimit-Remaining',Math.max(0,max-current));
            res.setHeader('X-RateLimit-Reset',Date.now()+(ttl*1000));

            if(current>max){
                const retryAfter=ttl;
                res.setHeader('Retry-After',retryAfter);
                throw new AppError(message,429);
            }

            req.rateLimit={
                current,limit:max,remaining:Math.max(0,max-current),
                reset:Date.now()+(ttl*1000)
            }
            next();
        }
        catch(error){
            //if redis is down then allow request through(fail open vs fail closed)
            if(error.message.includes('Redis')){
                console.error('Rate limiter Redis error:',error);
                return next();
            }
            next(error);
        }
    }
}

const rateLimiters = {
  api: rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100
  }),

  auth: rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many authentication attempts, please try again later'
  }),
  urlCreation: rateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: 'URL creation limit reached, please try again later'
  }),
  redirect: rateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many redirect requests'
  })
};

module.exports={
    rateLimiter,
    rateLimiters
}