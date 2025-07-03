'use strict';
const router = require('express').Router();
const quoteController = require('../controllers/quote.controller.js');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // 引入 uuid

// 配置 multer 存储 (用于接收 Excel 文件)
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`); } // 使用UUID确保文件名唯一
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 限制文件大小 5MB
});

// API 1: 上传历史报价 (接收 Excel 文件)
router.post('/upload-history', upload.single('quoteFile'), quoteController.uploadHistoryQuotes);

// API 2: 根据零件号模糊查询历史报价 (下拉框数据源)
router.get('/search', quoteController.searchHistoricalQuotes);

// API 3: 上传零件号列表批量查询报价 (接收 Excel 文件)
router.post('/batch-inquiry', upload.single('partNumbersFile'), quoteController.batchQuoteInquiry);

module.exports = router;
