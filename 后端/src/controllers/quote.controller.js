// 文件路径: src/controllers/quote.controller.js (最终完整版)

'use strict';
const db = require('../models');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// 辅助函数：执行原始 SQL 查询，确保始终返回数组
const executeRawQuery = async (sql, replacements) => {
    try {
        const [results] = await db.sequelize.query(sql, { replacements, type: db.Sequelize.QueryTypes.SELECT });
        return Array.isArray(results) ? results : (results ? [results] : []);
    } catch (error) {
        console.error("[Quote Controller] Raw query failed:", error);
        throw error;
    }
};

// --- API 1: 上传历史报价 ---
exports.uploadHistoryQuotes = async (req, res, next) => {
    if (!req.file || req.file.size === 0) return res.status(400).json({ error: 'Excel file is required and cannot be empty.' });
    if (!req.body.customerName || req.body.customerName.trim() === '') return res.status(400).json({ error: 'Customer name is required.' });

    const { customerName } = req.body;
    const { id: userId } = req.user;
    const { path: filePath } = req.file;

    try {
        const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error("Excel sheet not found.");

        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
        if (rows.length < 2) return res.status(400).json({ error: 'Excel file must contain a header and at least one data row.' });

        const headerRow = rows[0].map(h => typeof h === 'string' ? h.trim() : h);
        const partNumberColIndex = headerRow.indexOf('零件号');
        const priceRMBColIndex = headerRow.indexOf('人民币价格');
        const notesColIndex = headerRow.indexOf('备注');

        if (partNumberColIndex === -1) return res.status(400).json({ error: 'Excel file is missing "零件号" column.' });

        const quotesToCreate = [];
        const quoteDate = new Date();

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const partNumber = typeof row[partNumberColIndex] === 'string' ? row[partNumberColIndex].trim().toUpperCase() : null;
            if (!partNumber) continue;
            
            const priceRMB = row[priceRMBColIndex];
            const notes = typeof row[notesColIndex] === 'string' ? row[notesColIndex].trim() : null;

            quotesToCreate.push({
                id: uuidv4(), userId, customerName: customerName.trim(), partNumber,
                priceRMB: priceRMB !== null && !isNaN(parseFloat(priceRMB)) ? parseFloat(priceRMB) : null,
                notes, quoteDate,
                createdAt: new Date(), updatedAt: new Date()
            });
        }

        if (quotesToCreate.length === 0) return res.status(400).json({ error: 'No valid quote data found in the Excel file.' });

        await db.Quote.bulkCreate(quotesToCreate);
        res.status(201).json({ message: `Successfully uploaded ${quotesToCreate.length} quote records.` });

    } catch (error) {
        next(error);
    } finally {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

// --- API 2: 模糊搜索历史报价 ---
exports.searchHistoricalQuotes = async (req, res, next) => {
    const { query } = req.query;
    if (!query || query.trim() === '') return res.status(400).json({ error: 'Search query is required.' });
    
    try {
        const sql = `
            SELECT id AS quoteId, customerName, partNumber, priceRMB, notes, quoteDate
            FROM Quotes 
            WHERE partNumber LIKE :searchTerm
            ORDER BY partNumber ASC, quoteDate DESC;
        `;
        const allMatchingQuotes = await executeRawQuery(sql, { searchTerm: `%${query.trim().toUpperCase()}%` });

        const groupedQuotes = allMatchingQuotes.reduce((acc, quote) => {
            let group = acc.find(item => item.partNumber === quote.partNumber);
            if (!group) {
                group = { partNumber: quote.partNumber, quotes: [] };
                acc.push(group);
            }
            group.quotes.push({
                quoteId: quote.quoteId,
                quoteDate: new Date(quote.quoteDate).toISOString(),
                customerName: quote.customerName,
                priceRMB: quote.priceRMB !== null ? parseFloat(quote.priceRMB).toFixed(2) : null,
                notes: quote.notes
            });
            return acc;
        }, []);

        res.status(200).json(groupedQuotes);
    } catch (error) {
        next(error);
    }
};

// --- API 3: 上传零件号列表批量查询报价 (恢复这个缺失的函数) ---
exports.batchQuoteInquiry = async (req, res, next) => {
    if (!req.file || req.file.size === 0) {
        return res.status(400).json({ error: 'Excel file is required and cannot be empty.' });
    }
    
    const { path: filePath } = req.file;

    try {
        const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error("Excel sheet not found.");
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
        const dataRows = rows.length > 0 && rows[0][0] === "零件号" ? rows.slice(1) : rows;
        if (dataRows.length === 0) return res.status(400).json({ error: 'Excel file has no data rows.' });
        
        const partNumbersToQuery = dataRows.map(row => (row && typeof row[0] === 'string') ? row[0].trim().toUpperCase() : null).filter(Boolean);
        if (partNumbersToQuery.length === 0) return res.status(400).json({ error: 'No valid part numbers found in Excel.' });

        const results = [];
        for (const pn of partNumbersToQuery) {
            const sql = `
                SELECT id AS quoteId, customerName, partNumber, priceRMB, notes, quoteDate
                FROM Quotes WHERE partNumber = :partNumberQuery ORDER BY quoteDate DESC;
            `;
            const quotesForPart = await executeRawQuery(sql, { partNumberQuery: pn });
            results.push({
                queryPartNumber: pn,
                quotes: quotesForPart.map(q => ({
                    quoteId: q.quoteId,
                    quoteDate: new Date(q.quoteDate).toISOString(),
                    customerName: q.customerName,
                    priceRMB: q.priceRMB ? parseFloat(q.priceRMB).toFixed(2) : null,
                    notes: q.notes
                }))
            });
        }
        res.status(200).json(results);

    } catch (error) {
        next(error);
    } finally {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};