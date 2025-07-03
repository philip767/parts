// 文件路径: src/api/inventory.routes.js (最终修正版)

const router = require('express').Router();
const inventoryController = require('../controllers/inventory.controller.js');
const { cacheMiddleware } = require('../middleware/cache.middleware.js');

// API 1: 模糊搜索，返回简化列表 (零件号, 库存数)
// GET /api/inventory/search?query=...
router.get('/search', cacheMiddleware(180), inventoryController.searchInventory); // 3分钟缓存

// API 2: 模糊搜索，返回定制的详情列表
// GET /api/inventory/search-full-details?query=...
router.get('/search-full-details', cacheMiddleware(300), inventoryController.searchFullDetails); // 5分钟缓存

// API 3: 精确查询单个零件详情
// GET /api/inventory/part/:partNumber
router.get('/part/:partNumber', cacheMiddleware(600), inventoryController.getPartDetails); // 10分钟缓存


module.exports = router;