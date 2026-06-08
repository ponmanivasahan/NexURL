const authService=require('../services/authService');
const ApiResponse=require('../utils/response');

class AuthController{
    async register(req,res,next){
        try {
            const {username,email,password}=req.body;
            const result=await authService.register({username,email,password});
            return ApiResponse.created(res,result,'Registration successful');
        } catch (error) {
            next(error);
        }
    }

    async login(req,res,next){
        try {
            const {email,username,identifier,password}=req.body;
            const loginIdentifier = email || username || identifier;
            const result=await authService.login(loginIdentifier,password);
            return ApiResponse.success(res,result,'Login Successful');
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req,res,next){
        try {
            const {refreshToken}=req.body;
            if(!refreshToken){
                return ApiResponse.badRequest(res,'Refresh token is required');
            }
            const tokens=await authService.refreshToken(refreshToken);
            return ApiResponse.success(res,{tokens},'Token refreshed successfully');
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req,res,next){
        try {
            const User=require('../models/User');
            const user=await User.findByEmail(req.user.id);

            if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at
        }
      });
        } catch (error) {
            next (error);
        }
    }
    async logout(req, res, next) {
    try {
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

}

module.exports=new AuthController();