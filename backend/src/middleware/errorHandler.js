const logger=require('../utils/logger');
class AppError extends Error{
    constructor(message,statusCode,errors=null){
        super(message);
        this.statusCode=statusCode;
        this.errors=errors;
        this.isOperational=true;
        Error.captureStackTrace(this,this.constructor)
    }
}

const errorHandler=(err,req,res,next)=>{
    logger.error('Error:',{
        message:err.message,
        stack:err.stack,
        requestId:req.requestId,
        url:req.originalUrl,
        method:req.method
    })
     if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      timestamp: new Date().toISOString()
    });
  }

  // For unexpected errors, don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(500).json({
    success:false,
    message:err.message,
    stack:err.stack,
    timestamp:new Date().toISOString()
  });
}

module.exports=errorHandler;
module.exports.AppError=AppError;