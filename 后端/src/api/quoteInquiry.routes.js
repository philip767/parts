// 文件路径: src/api/quoteInquiry.routes.js

'use strict';
const router = require('express').Router();
// 确保引入路径和文件名正确
const quoteInquiryController = require('../controllers/quoteInquiry.controller.js'); 
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

// API 1: 上传 Excel 并保存为报价单
// POST /api/quote-inquiries/upload-and-save
router.post('/upload-and-save', upload.single('partNumbersFile'), quoteInquiryController.uploadAndSaveQuoteInquiry);

// API 2: 获取所有报价单列表
// GET /api/quote-inquiries/
router.get('/', quoteInquiryController.getAllQuoteInquiries);

// API 3: 获取单个报价单详情
// GET /api/quote-inquiries/:inquiryId
router.get('/:inquiryId', quoteInquiryController.getQuoteInquiryById);

// API 4: 删除报价单
// DELETE /api/quote-inquiries/:inquiryId
router.delete('/:inquiryId', quoteInquiryController.deleteQuoteInquiry);

// API 5: 更新报价单明细项 (用户选择报价后调用)
// PUT /api/quote-inquiries/:inquiryId/items/:itemId
router.put('/:inquiryId/items/:itemId', quoteInquiryController.updateQuoteInquiryItem);

module.exports = router;