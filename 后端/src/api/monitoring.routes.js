// 文件路径: src/api/monitoring.routes.js
const router = require('express').Router();
const monitoringController = require('../controllers/monitoring.controller.js');

// 定义一个 PUT 路由来更新单个零件的监控设置
router.put('/parts/:partId', monitoringController.updateMonitoringSettings);

module.exports = router;