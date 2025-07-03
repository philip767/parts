// 文件路径: src/controllers/quoteInquiry.controller.js
'use strict';
const db = require('../models');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { searchHistoricalQuotes } = require('./quote.controller.js'); // 引入历史报价查询逻辑

// 辅助函数，用于调用内部的 searchHistoricalQuotes 逻辑
const getQuotesForPartNumbers = async (partNumbers, user) => {
    const quoteResults = [];
    for (const pn of partNumbers) {
        // 模拟一个请求对象
        const mockReq = { query: { query: pn }, user: user };
        const mockRes = { 
            data: null,
            statusCode: 200,
            status: function(code) { this.statusCode = code; return this; },
            json: function(d) { this.data = d; }
        };
        
        // 调用 searchHistoricalQuotes 来获取分组后的数据
        await searchHistoricalQuotes(mockReq, mockRes, () => {});
        
        // searchHistoricalQuotes 返回的是按零件号分组的数组，我们取第一个即可
        const foundGroup = mockRes.data.find(group => group.partNumber === pn);

        quoteResults.push({
            queryPartNumber: pn,
            quotes: foundGroup ? foundGroup.quotes : []
        });
    }
    return quoteResults;
};


// API: 上传 Excel，执行批量查询，并保存为报价单
exports.uploadAndSaveQuoteInquiry = async (req, res, next) => {
    if (!req.file || req.file.size === 0) return res.status(400).json({ error: 'Excel file is required and cannot be empty.' });
    if (!req.body.customerName || req.body.customerName.trim() === '') return res.status(400).json({ error: 'Customer name is required.' });

    const { customerName } = req.body;
    const { id: userId } = req.user;
    const { originalname: fileName, path: filePath } = req.file;

    try {
        const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error("Excel sheet not found.");
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
        const dataRows = rows.length > 0 && rows[0][0] === "零件号" ? rows.slice(1) : rows;
        if (dataRows.length === 0) return res.status(400).json({ error: 'Excel file has no data rows.' });
        
        const partNumbersFromExcel = dataRows.map(row => (row && typeof row[0] === 'string') ? row[0].trim().toUpperCase() : null).filter(Boolean);
        if (partNumbersFromExcel.length === 0) return res.status(400).json({ error: 'No valid part numbers found in Excel.' });
        
        let finalRecord;
        
        await db.sequelize.transaction(async (t) => {
            const newQuoteInquiry = await db.QuoteInquiry.create({
                userId, customerName: customerName.trim(), fileName,
                inquiryDate: new Date(), totalParts: partNumbersFromExcel.length, totalQuotesFound: 0
            }, { transaction: t });
            
            if (!newQuoteInquiry.id) throw new Error("Failed to get ID after creating QuoteInquiry.");

            const inquiryDetails = await getQuotesForPartNumbers(partNumbersFromExcel, req.user);
            
            let totalItemsWithQuotes = 0;
            const itemsToCreate = [];
            for (const detail of inquiryDetails) {
                itemsToCreate.push({
                    id: uuidv4(), quoteInquiryId: newQuoteInquiry.id,
                    partNumber: detail.queryPartNumber, quotesJson: detail.quotes, selectedQuoteId: null
                });
                if (detail.quotes.length > 0) totalItemsWithQuotes++;
            }

            if (itemsToCreate.length > 0) {
                await db.QuoteInquiryItem.bulkCreate(itemsToCreate, { transaction: t });
            }

            await newQuoteInquiry.update({ totalQuotesFound: totalItemsWithQuotes }, { transaction: t });
            
            finalRecord = await db.QuoteInquiry.findByPk(newQuoteInquiry.id, {
                include: [{ model: db.QuoteInquiryItem, as: 'items' }],
                transaction: t
            });
        });
        
        if (finalRecord) {
            res.status(201).json(finalRecord);
        } else {
            throw new Error("Transaction completed but failed to fetch the final record.");
        }

    } catch (error) {
        next(error);
    } finally {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

// --- 其他 QuoteInquiry 操作函数 ---
exports.getAllQuoteInquiries = async (req, res, next) => {
    try {
        const inquiries = await db.QuoteInquiry.findAll({ where: { userId: req.user.id }, order: [['inquiryDate', 'DESC']] });
        res.status(200).json(inquiries);
    } catch (error) { next(error); }
};
exports.getQuoteInquiryById = async (req, res, next) => {
    try {
        const quoteInquiry = await db.QuoteInquiry.findOne({
            where: { id: req.params.inquiryId, userId: req.user.id },
            include: [{ model: db.QuoteInquiryItem, as: 'items', order: [['createdAt', 'ASC']] }]
        });
        if (!quoteInquiry) return res.status(404).json({ error: 'Quote inquiry record not found.' });
        res.status(200).json(quoteInquiry);
    } catch (error) { next(error); }
};
exports.deleteQuoteInquiry = async (req, res, next) => {
    try {
        const result = await db.QuoteInquiry.destroy({ where: { id: req.params.inquiryId, userId: req.user.id } });
        if (result === 0) return res.status(404).json({ error: 'Quote inquiry record not found.' });
        res.status(204).send();
    } catch (error) { next(error); }
};
exports.updateQuoteInquiryItem = async (req, res, next) => {
    try {
        const { inquiryId, itemId } = req.params;
        const { selectedQuoteId } = req.body;
        const item = await db.QuoteInquiryItem.findOne({
            where: { id: itemId, quoteInquiryId: inquiryId },
            include: [{ model: db.QuoteInquiry, where: { userId: req.user.id } }]
        });
        if (!item) return res.status(404).json({ error: 'Quote inquiry item not found.' });
        item.selectedQuoteId = selectedQuoteId || null;
        await item.save();
        res.status(200).json(item);
    } catch (error) { next(error); }
};
