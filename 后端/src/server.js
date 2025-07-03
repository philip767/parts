// 文件路径: src/server.js

// ==================== 全局错误捕获安全网 ====================
// 这两段代码必须放在文件的最顶部，才能捕获所有后续的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('--- UNHANDLED REJECTION ---');
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('--- UNCAUGHT EXCEPTION ---');
  console.error('Uncaught Exception:', error);
  process.exit(1); // 这是一个致命错误，必须退出
});
// =================================================================

require('dotenv').config();
const app = require('./app');
const db = require('./models');
const stockScheduler = require('./services/stockScheduler.service.js'); // 引入我们的新服务

const PORT = process.env.PORT || 3001;

// 连接主数据库并启动应用
db.sequelize.sync()
  .then(() => {
    console.log('✅ Main Parts DB (MySQL/PostgreSQL) synchronized successfully.');
    
    // 启动定时任务调度器
    stockScheduler.start(); 
    
    // 启动 Express 服务器
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}.`);
    });
  })
  .catch((err) => {
    console.error('❌ Unable to connect to the main database:', err);
    process.exit(1);
  });