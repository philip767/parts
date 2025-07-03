'use strict';

const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 写入日志文件
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} data - 额外数据
 */
const writeLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  const logFile = path.join(logDir, `${level}.log`);
  const logLine = JSON.stringify(logEntry) + '\n';

  fs.appendFileSync(logFile, logLine);
};

/**
 * 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  writeLog('info', 'API Request Started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  });

  // 重写res.end以记录响应时间
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    writeLog('info', 'API Request Completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous'
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * 错误日志中间件
 */
const errorLogger = (err, req, res, next) => {
  writeLog('error', 'API Error', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id || 'anonymous',
    body: req.body,
    query: req.query,
    params: req.params
  });

  next(err);
};

/**
 * 性能监控中间件
 */
const performanceLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // 转换为毫秒
    
    if (duration > 1000) { // 记录超过1秒的请求
      writeLog('warn', 'Slow API Request', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration.toFixed(2)}ms`,
        userId: req.user?.id || 'anonymous'
      });
    }
  });

  next();
};

/**
 * 手动日志记录函数
 */
const logInfo = (message, data = {}) => {
  writeLog('info', message, data);
};

const logError = (message, data = {}) => {
  writeLog('error', message, data);
};

const logWarn = (message, data = {}) => {
  writeLog('warn', message, data);
};

module.exports = {
  requestLogger,
  errorLogger,
  performanceLogger,
  logInfo,
  logError,
  logWarn
}; 