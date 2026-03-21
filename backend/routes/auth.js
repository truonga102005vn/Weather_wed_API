// ================================================
//  routes/auth.js
// ================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit   = require('express-rate-limit');

// Giới hạn đăng nhập: 10 lần / 15 phút (chống brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Quá nhiều lần thử đăng nhập. Thử lại sau 15 phút.' },
});

router.post('/register', controller.register);
router.post('/login',    loginLimiter, controller.login);
router.get ('/me',       protect, controller.getMe);
router.patch('/me',          protect, controller.updateMe);
router.patch('/me/password',  protect, controller.changePassword);

module.exports = router;