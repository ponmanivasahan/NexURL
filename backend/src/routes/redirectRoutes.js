const express = require('express');
const router = express.Router();
const redirectController = require('../controllers/redirectController');
const { rateLimiter } = require('../middleware/rateLimiter');

router.get('/:shortCode',
  rateLimiter({ 
    windowMs: 60 * 1000,
    max: 100
  }),
  redirectController.redirect
);

router.get('/p/:shortCode',
  rateLimiter({
    windowMs: 60 * 1000,
    max: 50
  }),
  redirectController.previewRedirect
);

router.get('/api/v1/redirect/:shortCode/info',
  rateLimiter({
    windowMs: 60 * 1000,
    max: 30
  }),
  redirectController.getRedirectInfo
);

module.exports = router;