const router = require('express').Router();
const { registerUser, loginUser, publicUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, (req, res) => res.json(publicUser(req.user)));
module.exports = router;
