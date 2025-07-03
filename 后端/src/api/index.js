'use strict';
const router = require('express').Router();

const authRoutes = require('./auth.routes.js');
const orderRoutes = require('./orders.routes.js');
const inventoryRoutes = require('./inventory.routes.js');
const monitoringRoutes = require('./monitoring.routes.js');
const memoRoutes = require('./memo.routes.js');
const adminRoutes = require('./admin.routes.js');
const quoteRoutes = require('./quote.routes.js'); // 之前引入的 Quotes 路由
const quoteInquiryRoutes = require('./quoteInquiry.routes.js'); // <-- 新增引入

const { protect } = require('../middleware/auth.middleware.js');
const { adminProtect } = require('../middleware/adminAuth.middleware.js');

router.use('/auth', authRoutes);
router.use(protect);

router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/memos', memoRoutes);
router.use('/quotes', quoteRoutes); // 之前的 quotes 模块
router.use('/quote-inquiries', quoteInquiryRoutes); // <-- 使用新路由

router.use('/admin', adminProtect, adminRoutes);

module.exports = router;