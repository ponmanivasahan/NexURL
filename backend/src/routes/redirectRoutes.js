const express=require('express');
const router=express.Router();
const redirectController=require('../controllers/redirectController');
const {rateLimiter}=require('../middleware/rateLimiter');
const { route } = require('./urlRoutes');

router.get('/:shortCode',rateLimiter({
    windowMs:60*1000,
    max:100,
    skipSuccessfulRequests:false
}), redirectController.redirect);
module.exports=router;