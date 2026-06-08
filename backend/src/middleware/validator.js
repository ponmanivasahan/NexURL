const { error } = require('../utils/response');
const {AppError}=require('./errorHandler');

const validators={
    register:(req,res,next)=>{
        const {username,email,password}=req.body;
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
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
        }

        if (!password || typeof password !== 'string') {
            errors.push('Password is required');
        } else if (password.length < 8) {
            errors.push('Password must be at least 8 characters');
        } else if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        } else {
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

        next();
    },

    login:(req,res,next)=>{
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : req.body.email;
        const username = typeof req.body.username === 'string' ? req.body.username.trim() : req.body.username;
        const userName = typeof req.body.userName === 'string' ? req.body.userName.trim() : req.body.userName;
        const userEmail = typeof req.body.userEmail === 'string' ? req.body.userEmail.trim() : req.body.userEmail;
        const identifier = typeof req.body.identifier === 'string' ? req.body.identifier.trim() : req.body.identifier;
        const login = typeof req.body.login === 'string' ? req.body.login.trim() : req.body.login;
        const credential = typeof req.body.credential === 'string' ? req.body.credential.trim() : req.body.credential;
        const password = typeof req.body.password === 'string' ? req.body.password.trim() : req.body.password;
        const errors=[];

        const loginIdentifier = email || userEmail || username || userName || identifier || login || credential;

        if(!loginIdentifier) errors.push('Email or username is required');
        if(!password) errors.push('Password is required');

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
        }

        if(errors.length>0){
            throw new AppError('Validation failed',400,errors);
        }

        req.body.email = email;
        req.body.username = username || userName;
        req.body.identifier = loginIdentifier;
        req.body.password = password;

        next();
    },

    createUrl:(req,res,next)=>{
        const {url,customAlias}=req.body;
        const errors=[];

        if(!url){
            errors.push('URL is required');
        }
        else{
            try {
                const urlObj=new URL(url);
                if(!['http:','https:'].includes(urlObj.protocol)){
                    errors.push('Only HTTP and HTTPS URLs are allowed');
                }
            } catch (e) {
                errors.push('Invalid URL Format');
            }
        }

     if(customAlias){
        if(customAlias.length<4){
            errors.push('Custom alias must be at least 4 chars');
        }
        if(customAlias.length>30){
            errors.push('Custom alias must be less than 30 chars');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
            errors.push('Custom alias can only contain letters, numbers, hyphens, and underscores');
        }
     }  
     
     if (errors.length>0){
        throw new AppError('Validation failed',400,errors);
     }
     next();
    }
}

const validate=(type)=>{
    const validator=validators[type];
    if(!validator){
        throw new Error(`Validator '${type}' not found`);
    }
    return validator;
}
module.exports={validate};