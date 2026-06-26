const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/queues', queueController.getQueueStats);
router.get('/queues/:queueName', queueController.getQueueDetails);
router.post('/queues/:queueName/retry', queueController.retryFailedJobs);
router.delete('/queues/:queueName/clean', queueController.cleanQueue);

module.exports = router;