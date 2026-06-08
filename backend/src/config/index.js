const db=require('./db')
const redis=require('./redis')
const initializeConfigs=async()=>{
    try {
        await db.initialize();
        await redis.initialize();
        console.log('All configurations initialized successfully');
    } 
    catch(error){
        console.error('Configuration initialization failed:', error.message);
        process.exit(1);
    }
}

module.exports={
    db,redis,initializeConfigs
}