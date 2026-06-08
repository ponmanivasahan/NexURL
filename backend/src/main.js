const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const morgan=require('morgan');
const crypto=require('crypto');
const logger=require('./utils/logger');
const errorHandler=require('./middleware/errorHandler');
const { initializeConfigs, db, redis } = require('./config');
const urlRoutes = require('./routes/urlRoutes');
const authRoutes = require('./routes/authRoutes');
const redirectRoutes = require('./routes/redirectRoutes');
const urlShortnerService = require('./services/urlShortner');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app=express();
let server;
let shutdownTimer;

app.use(helmet());
app.use(cors({
    origin:process.env.BASE_URL,
    methods:['GET','POST','PUT','DELETE','PATCH'],
    allowedHeaders:['Content-Type','Authorization'],
    credentials:true
}));

app.use(express.json({limit:'10kb'}));
app.use(express.urlencoded({extended:true,limit:'10kb'}));

app.use((req,res,next)=>{
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// HTTP request logging
app.use(morgan('combined',{stream:logger.stream}));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1/urls', urlRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/', redirectRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
  }

  if (!server) {
    return process.exit(0);
  }

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      if (db.pool) {
        await db.pool.end();
        logger.info('Database connections closed');
      }

      if (redis.client) {
        await redis.client.quit();
        logger.info('Redis connection closed');
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  shutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

const startServer = async () => {
  try {
    await initializeConfigs();

    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`Health check: http://localhost:${PORT}/health`);

      if (process.env.NODE_ENV === 'production') {
        setTimeout(async () => {
          try {
            await urlShortnerService.preloadPopularUrls();
            logger.info('Cache preloading completed');
          } catch (error) {
            logger.error('Cache preloading failed:', error);
          }
        }, 5000);
      }
    });

    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.once('SIGINT', () => gracefulShutdown('SIGINT'));

    process.once('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.once('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };