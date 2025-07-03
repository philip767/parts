// 文件路径: src/api/auth.routes.js
const router = require('express').Router();
const authController = require('../controllers/auth.controller.js');
const { authRateLimit } = require('../middleware/rateLimit.middleware.js');

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);

module.exports = router;