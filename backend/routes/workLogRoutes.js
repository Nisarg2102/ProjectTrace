const router = require('express').Router();
const { getMyWorkLog, startSession, endSession, heartbeat } = require('../controllers/workLogController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', getMyWorkLog);
router.post('/start', startSession);
router.post('/heartbeat', heartbeat);
router.post('/end', endSession);
module.exports = router;
