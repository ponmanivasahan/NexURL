const jwt=require('jsonwebtoken');
const User=require('../models/User');
const {AppError}=require('../middleware/errorHandler');
require('dotenv').config();

class AuthService{
    constructor(){
        this.JWT_SECRET=process.env.JWT_SECRET;
        this.JWT_EXPIRES_IN=process.env.JWT_EXPIRES_IN;
        this.REFRESH_TOKEN_EXPIRES_IN=process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
    }

    async register({username,email,password}){
        this.validateRegistration({username,email,password});
        const existingUser=await User.findByEmail(email);
        if(existingUser){
            throw new AppError('Email already registered',409);
        }

        const user=await User.create({username,email,password});

        const tokens=this.generateTokens(user);
        return{
            user:{
              id:user.id,
              username:user.username,
              email:user.email,
              createdAt:user.createdAt  
            },
            tokens
        }
    }

    async login(identifier,password){
        if(!identifier || !password){
            throw new AppError('Email or username and password are required',400);
        }

        const loginIdentifier = typeof identifier === 'string' ? identifier.trim() : identifier;

        let user=await User.findByLoginIdentifier(loginIdentifier);
        if(!user){
            // If the login identifier is a valid email, auto-register the user!
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier);
            if (isEmail) {
                try {
                    // Extract username from email
                    let baseUsername = loginIdentifier.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
                    if (baseUsername.length < 3) {
                        baseUsername = 'user_' + baseUsername;
                    }
                    let username = baseUsername.slice(0, 30);
                    
                    // Ensure username is unique
                    let userCheck = await User.findByLoginIdentifier(username);
                    while (userCheck) {
                        const suffix = Math.floor(100 + Math.random() * 900).toString();
                        username = (baseUsername.slice(0, 26) + suffix);
                        userCheck = await User.findByLoginIdentifier(username);
                    }
                    
                    // Create user directly
                    await User.create({
                        username,
                        email: loginIdentifier,
                        password
                    });
                    
                    // Fetch full user record
                    user = await User.findByLoginIdentifier(loginIdentifier);
                } catch (regError) {
                    console.error('Auto-registration failed:', regError.message);
                    throw new AppError('Invalid email or password', 401);
                }
            } else {
                throw new AppError('Invalid email or password', 401);
            }
        }

        if(!user.is_active){
            throw new AppError('Account has been deactivated',403);
        }

        const isValidPassword=await User.verifyPassword(password,user.password_hash);
        if(!isValidPassword){
            throw new AppError('Invalid email or password',401);
        }

        const tokens=this.generateTokens(user);
        return{
            user:{
                id:user.id,
                username:user.username,
                email:user.email,
                createdAt:user.created_at
            },
            tokens
        };
    }

    generateTokens(user){
        const payload={
            userId:user.id,
            email:user.email,
            username:user.username
        }

        const accessToken=jwt.sign(payload,this.JWT_SECRET,{
            expiresIn:this.JWT_EXPIRES_IN,
            issuer:'url-shortner',
            audience:'api'
        });

        const refreshToken=jwt.sign(
            {userId:user.id,type:'refresh'},
            this.JWT_SECRET,
            {
                expiresIn:this.REFRESH_TOKEN_EXPIRES_IN,
                issuer:'url-shortner',
                audience:'api'
            }
        );

        return{
            accessToken,refreshToken,
            expiresIn:this.parseExpiry(this.JWT_EXPIRES_IN)
        };
    }

    async refreshToken(refreshToken){
        try {
            const decoded=jwt.verify(refreshToken,this.JWT_SECRET,{
                issuer:'url-shortner',
                audience:'api'
            })
            if (decoded.type !== 'refresh') {
                throw new AppError('Invalid refresh token', 401);
            }

            const user=await User.findById(decoded.userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            return this.generateTokens(user);
        } catch (error) {
            if(error instanceof jwt.JsonWebTokenError){
                throw new AppError('Invalid refresh token',401);
            }
            if(error instanceof jwt.TokenExpiredError){
                throw new AppError('Refresh token expired',401);
            }
            throw error;
        }
    }

    verifyAccessToken(token){
        try {
            return jwt.verify(token,this.JWT_SECRET,{
                issuer:'url-shortner',
                audience:'api'
            });
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError('Token expired', 401);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                 throw new AppError('Invalid token', 401);
            }
           throw error;
        }
    }

    validateRegistration({username,email,password}){
        const errors=[];

        if (!username || typeof username !== 'string') {
            errors.push('Username is required');
        } else if (username.length < 3) {
            errors.push('Username must be at least 3 characters');
        } else if (username.length > 30) {
          errors.push('Username must be less than 30 characters');
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          errors.push('Username can only contain letters, numbers, and underscores');
        }   
        
        if (!email || typeof email !== 'string') {
           errors.push('Email is required');
        }
        else if (!this.isValidEmail(email)) {
            errors.push('Invalid email format');
        }   
        
        if (!password || typeof password !== 'string') {
           errors.push('Password is required');
        }
         else if (password.length < 8) {
           errors.push('Password must be at least 8 characters');
        }
         else if (password.length > 128) {
           errors.push('Password must be less than 128 characters');
        }
         else {
            if (!/[A-Z]/.test(password)) {
                errors.push('Password must contain at least one uppercase letter');
            }
           if (!/[a-z]/.test(password)) {
              errors.push('Password must contain at least one lowercase letter');
            }
           if (!/[0-9]/.test(password)) {
              errors.push('Password must contain at least one number');
            }
           if (!/[!@#$%^&*]/.test(password)) {
              errors.push('Password must contain at least one special character');
            }
        }

        if(errors.length>0){
            throw new AppError('Validation failed',400,errors);
        }
    }

      isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }

    parseExpiry(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 'd': return value * 24 * 60 * 60;
      case 'h': return value * 60 * 60;
      case 'm': return value * 60;
      case 's': return value;
      default: return 7 * 24 * 60 * 60;
    }
  } 
}

module.exports=new AuthService();