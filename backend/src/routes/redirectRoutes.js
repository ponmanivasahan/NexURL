const express = require('express');
const router = express.Router();
const redirectController = require('../controllers/redirectController');
const { rateLimiter } = require('../middleware/rateLimiter');

router.get('/:shortCode',
  rateLimiter({ 
    windowMs: 60 * 1000,
    max: 100
  }),
  (req, res, next) => redirectController.redirect(req, res, next)
);

router.get('/p/:shortCode',
  rateLimiter({
    windowMs: 60 * 1000,
    max: 50
  }),
  (req, res, next) => redirectController.previewRedirect(req, res, next)
);

router.get('/api/v1/redirect/:shortCode/info',
  rateLimiter({
    windowMs: 60 * 1000,
    max: 30
  }),
  (req, res, next) => redirectController.getRedirectInfo(req, res, next)
);

module.exports = router;