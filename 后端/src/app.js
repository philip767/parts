const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api');
const { errorHandler } = require('./middleware/error.handler');
const { requestLogger, errorLogger, performanceLogger } = require('./middleware/logger.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 应用日志中间件
app.use(requestLogger);
app.use(performanceLogger);

// Provide static access to the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.send('Parts Management API is running!');
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use('/api', apiRoutes);

// 错误日志中间件必须在错误处理器之前
app.use(errorLogger);
app.use(errorHandler);

module.exports = app;
