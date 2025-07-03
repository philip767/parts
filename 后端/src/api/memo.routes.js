// 文件路径: src/api/memo.routes.js
const router = require('express').Router();
const memoController = require('../controllers/memo.controller.js');

// CRUD 路由
router.get('/', memoController.getAllMemos);
router.post('/', memoController.createMemo);
router.put('/:memoId', memoController.updateMemo);
router.delete('/:memoId', memoController.deleteMemo);

// --- 新增的执行任务路由 ---
router.post('/:memoId/execute', memoController.executeMemoTask);

module.exports = router;