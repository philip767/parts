'use strict';

const NodeCache = require('node-cache');

// 创建内存缓存实例，默认TTL为5分钟
const cache = new NodeCache({ 
  stdTTL: 300, // 5分钟
  checkperiod: 60, // 每分钟检查过期缓存
  useClones: false // 不使用克隆以提高性能
});

/**
 * 缓存中间件
 * @param {number} ttl - 缓存时间（秒），默认5分钟
 * @param {string} key - 自定义缓存键，默认使用URL
 * @returns {Function} Express中间件函数
 */
const cacheMiddleware = (ttl = 300, key = null) => {
  return (req, res, next) => {
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    // 生成缓存键
    const cacheKey = key || `${req.originalUrl || req.url}`;
    
    // 尝试从缓存获取数据
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log(`[Cache] Hit for key: ${cacheKey}`);
      return res.json(cachedResponse);
    }

    // 缓存未命中，重写res.json方法以缓存响应
    const originalJson = res.json;
    res.json = function(data) {
      // 只缓存成功的响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[Cache] Miss for key: ${cacheKey}, caching response`);
        cache.set(cacheKey, data, ttl);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * 清除特定缓存
 * @param {string} pattern - 缓存键模式，支持通配符
 */
const clearCache = (pattern = null) => {
  if (pattern) {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    cache.del(matchingKeys);
    console.log(`[Cache] Cleared ${matchingKeys.length} keys matching pattern: ${pattern}`);
  } else {
    cache.flushAll();
    console.log('[Cache] All cache cleared');
  }
};

/**
 * 获取缓存统计信息
 * @returns {Object} 缓存统计
 */
const getCacheStats = () => {
  return cache.getStats();
};

module.exports = {
  cacheMiddleware,
  clearCache,
  getCacheStats,
  cache // 导出缓存实例供其他地方使用
}; 