// 文件路径: src/api/admin.routes.js
const router = require('express').Router();
const adminController = require('../controllers/admin.controller.js');

// 用户管理路由
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// 订单管理路由
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:orderId', adminController.getAdminOrderDetails);
router.delete('/orders/:orderId', adminController.deleteOrderByAdmin);

module.exports = router;
