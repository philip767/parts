// 文件路径: src/services/inventoryDb.service.js

const { Sequelize } = require('sequelize');

// 从环境变量中读取 MSSQL 数据库的连接信息
const {
    INVENTORY_DB_HOST,
    INVENTORY_DB_USER,
    INVENTORY_DB_PASSWORD,
    INVENTORY_DB_NAME,
    INVENTORY_DB_PORT
} = process.env;

// 检查是否所有必需的环境变量都已设置
if (!INVENTORY_DB_HOST || !INVENTORY_DB_USER || !INVENTORY_DB_PASSWORD || !INVENTORY_DB_NAME) {
    console.error("❌ Inventory DB connection details are missing in .env file.");
    // 在实际应用中，你可能希望在这里抛出错误或退出进程
}

// 创建一个新的 Sequelize 实例，专门用于连接 MSSQL
const inventorySequelize = new Sequelize(INVENTORY_DB_NAME, INVENTORY_DB_USER, INVENTORY_DB_PASSWORD, {
    host: INVENTORY_DB_HOST,
    port: INVENTORY_DB_PORT || 1433, // 使用环境变量中的端口，或默认 1433
    dialect: 'mssql',                // 指定数据库方言为 mssql
    dialectOptions: {
        // tedious 驱动的特定选项
        options: {
            encrypt: false, // 如果你的 SQL Server 要求加密连接，请设为 true
            trustServerCertificate: true // 在某些情况下需要信任自签名证书
        }
    },
    logging: false, // 关闭日志输出，保持控制台清洁
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    }
});

// 测试连接
inventorySequelize.authenticate()
    .then(() => {
        console.log('✅ Connection to Inventory DB (MSSQL) has been established successfully.');
    })
    .catch(err => {
        console.error('❌ Unable to connect to the Inventory DB (MSSQL):', err);
    });

// 导出这个 Sequelize 实例，以便在其他地方使用
module.exports = inventorySequelize;