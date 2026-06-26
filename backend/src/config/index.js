const db=require('./db')
const redis=require('./redis')
const queueManager = require('./queue')

const initializeConfigs=async()=>{
    try {
        await db.initialize();
        await redis.initialize();
        if (redis.isConnected) {
            await queueManager.initialize();
            console.log('All configurations initialized successfully (with Redis & Queues)');
        } else {
            console.warn('Redis is not connected. Queue workers skipped. App will run in degraded mode.');
        }
    } 
    catch(error){
        console.error('Configuration initialization failed:', error.message);
        process.exit(1);
    }
}

module.exports={
    db,redis,queueManager,initializeConfigs
}