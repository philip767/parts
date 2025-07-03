// 认证中间件
const authMiddleware = require('./auth/auth.middleware');
const adminAuthMiddleware = require('./auth/adminAuth.middleware');

// 安全中间件
const rateLimitMiddleware = require('./security/rateLimit.middleware');
const ownershipMiddleware = require('./security/ownership.middleware');

// 性能中间件
const cacheMiddleware = require('./performance/cache.middleware');
const loggerMiddleware = require('./performance/logger.middleware');

// 通用中间件
const uploadMiddleware = require('./upload.middleware');
const errorHandler = require('./error.handler');

module.exports = {
  // 认证中间件
  authMiddleware,
  adminAuthMiddleware,
  
  // 安全中间件
  rateLimitMiddleware,
  ownershipMiddleware,
  
  // 性能中间件
  cacheMiddleware,
  loggerMiddleware,
  
  // 通用中间件
  uploadMiddleware,
  errorHandler
}; 