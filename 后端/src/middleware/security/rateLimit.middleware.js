'use strict';

const { cache } = require('./cache.middleware');

/**
 * 简单的内存限流器
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  /**
   * 检查是否超过限制
   * @param {string} key - 限流键（通常是IP或用户ID）
   * @param {number} limit - 限制次数
   * @param {number} windowMs - 时间窗口（毫秒）
   * @returns {boolean} 是否允许请求
   */
  isAllowed(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // 清理过期的请求记录
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);
    
    // 检查是否超过限制
    if (validRequests.length >= limit) {
      return false;
    }
    
    // 添加当前请求
    validRequests.push(now);
    return true;
  }

  /**
   * 清理过期的限流记录
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < maxAge);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// 每小时清理一次过期记录
setInterval(() => {
  rateLimiter.cleanup();
}, 60 * 60 * 1000);

/**
 * 通用限流中间件
 * @param {Object} options - 限流选项
 * @returns {Function} Express中间件
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15分钟
    max = 100, // 最大请求数
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => req.ip, // 默认使用IP作为键
    skipSuccessfulRequests = false, // 是否跳过成功请求
    skipFailedRequests = false // 是否跳过失败请求
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    
    if (!rateLimiter.isAllowed(key, max, windowMs)) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // 记录响应状态
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      
      if ((isSuccess && skipSuccessfulRequests) || (!isSuccess && skipFailedRequests)) {
        // 从限流记录中移除这个请求
        const requests = rateLimiter.requests.get(key) || [];
        if (requests.length > 0) {
          requests.pop();
        }
      }
      
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * 针对不同端点的限流配置
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 登录尝试限制
  message: '登录尝试次数过多，请15分钟后再试',
  keyGenerator: (req) => `auth:${req.ip}`
});

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // API请求限制
  message: 'API请求过于频繁，请稍后再试',
  keyGenerator: (req) => `api:${req.user?.id || req.ip}`
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 文件上传限制
  message: '文件上传次数过多，请1小时后再试',
  keyGenerator: (req) => `upload:${req.user?.id || req.ip}`
});

module.exports = {
  rateLimit,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit
}; 