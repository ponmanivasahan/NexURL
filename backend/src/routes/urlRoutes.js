const express=require('express');
const router=express.Router();
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const {validate}=require('../middleware/validator');
const {rateLimiter}=require('../middleware/rateLimiter');
const urlController = require('../controllers/urlController');

router.post('/',
    rateLimiter({windowMs:15*60*1000,max:30}),
    validate('createUrl'),
    optionalAuthenticate,
    urlController.createShortUrl
)

router.get('/',authenticate,urlController.getUserUrls);

router.delete('/:shortCode',authenticate,urlController.deleteUrl);
router.get('/:shortCode/analytics',authenticate,urlController.getUrlAnalytics);
module.exports=router;