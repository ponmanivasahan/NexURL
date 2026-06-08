const { decode } = require('jsonwebtoken');
const authService=require('../services/authService');
const {AppError}=require('./errorHandler');
const authenticate=(req,res,next)=>{
    try{
      const authHeader=req.headers.authorization;
      if(!authHeader){
        throw new AppError('Authorization header is required', 401);  
      }

      const parts=authHeader.split(' ');
      if(parts.length !==2 || parts[0]!=='Bearer'){
        throw new AppError('Invalid authorization format. Use Bearer <token>',401)
      }
      const token=parts[1];
      const decoded=authService.verifyAccessToken(token);

      req.user={
        id:decoded.userId,
        email:decoded.email,
        username:decoded.username
      }
      req.tokenExp=decoded.exp;
      next();
    }
    catch(error){
       next(error);
    }
}

const authorize=(...roles)=>{
  return (req,res,next)=>{
    if(req.user){
      throw new AppError('Authentication required',401);
    }
    if(!roles.includes(req.user.role)){
      throw new AppError('Insufficient permissions',403);
    }

    next();
  }
}

module.exports={
  authenticate,authorize
}