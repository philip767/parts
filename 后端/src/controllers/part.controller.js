// 文件路径: src/controllers/part.controller.js
'use strict';
const db = require('../models');
const Lj = require('../services/lj.model.js');

// 定义并导出辅助函数，以便其他控制器可以复用
const getInitialStock = async (partNumber) => {
    try {
        const inventoryPart = await Lj.findByPk(partNumber);
        return inventoryPart ? inventoryPart.stockQuantity : null;
    } catch (error) {
        console.error(`[Controller Helper] Failed to fetch initial stock for ${partNumber}:`, error);
        return null;
    }
};
exports.getInitialStock = getInitialStock;

// 功能：创建单个新零件
exports.createPart = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const partData = req.body;
        if (!partData.estimatedShippingDate) partData.estimatedShippingDate = null;
        
        const initialStock = await getInitialStock(partData.partNumber);

        const newPart = await db.Part.create({ 
            ...partData, 
            orderId,
            initialStock: initialStock,
            latestStock: initialStock,
            lastStockCheck: new Date(),
            isMonitored: true
        });
        res.status(201).json(newPart);
    } catch (error) { 
        console.error("--- ERROR IN createPart ---", error);
        next(error); 
    }
};

// 功能：更新零件信息
exports.updatePart = async (req, res, next) => {
    try {
        const { partId } = req.params;
        const part = await db.Part.findOne({ where: { id: partId, orderId: req.order.id }});
        if (!part) return res.status(404).json({ error: 'Part not found in this order' });

        const allowedUpdates = [
            'partNumber', 'partName', 'quantity', 'notesText', 
            'supplier', 'purchaser', 'estimatedShippingDate', 
            'isArrived', 'isOrderComplete', 'isMonitored', 'stockCheckInterval'
        ];
        const cleanUpdates = {};

        allowedUpdates.forEach(key => {
            if (req.body[key] !== undefined) {
                if (key === 'estimatedShippingDate') {
                    cleanUpdates[key] = (req.body[key] && String(req.body[key]).trim() !== '') ? new Date(req.body[key]) : null;
                } else if (key === 'isArrived' || key === 'isOrderComplete' || key === 'isMonitored') {
                    cleanUpdates[key] = ['true', '1', true].includes(req.body[key]);
                } else if (key === 'stockCheckInterval') {
                    const interval = Number(req.body[key]);
                    if (!isNaN(interval) && interval >= 60) cleanUpdates[key] = interval;
                } else {
                    cleanUpdates[key] = req.body[key];
                }
            }
        });

        let newNotes = part.notesText || '';
        const timestamp = `[${new Date().toLocaleString('zh-CN', { timeZone: "Asia/Shanghai" })}]`;
        let shouldTurnOffMonitoring = false;

        if (cleanUpdates.isArrived !== undefined && cleanUpdates.isArrived !== part.isArrived) {
            newNotes += `\n${timestamp} "是否到货" 状态更改为 "${cleanUpdates.isArrived ? '是' : '否'}".`;
            if(cleanUpdates.isArrived === true) shouldTurnOffMonitoring = true;
        }
        if (cleanUpdates.isOrderComplete !== undefined && cleanUpdates.isOrderComplete !== part.isOrderComplete) {
            newNotes += `\n${timestamp} "是否订货完成" 状态更改为 "${cleanUpdates.isOrderComplete ? '是' : '否'}".`;
            if(cleanUpdates.isOrderComplete === true) shouldTurnOffMonitoring = true;
        }
        
        if (shouldTurnOffMonitoring && cleanUpdates.isMonitored === undefined) {
            cleanUpdates.isMonitored = false;
            newNotes += `\n${timestamp} 系统自动关闭了库存监控。`;
        }

        if (cleanUpdates.notesText === undefined && newNotes.trim() !== (part.notesText || '').trim()) {
            cleanUpdates.notesText = newNotes.trim();
        }

        if (Object.keys(cleanUpdates).length > 0) {
            await part.update(cleanUpdates);
        }

        res.status(200).json(part);

    } catch (error) {
        console.error("--- ERROR IN updatePart ---", error);
        next(error);
    }
};

// 功能：将零件移至回收站 (软删除)
exports.softDeletePart = async (req, res, next) => {
    try {
        const part = await db.Part.findOne({ where: { id: req.params.partId, orderId: req.order.id }});
        if (!part) return res.status(404).json({ error: 'Part not found' });
        part.deletedDate = new Date();
        await part.save();
        res.status(204).send();
    } catch (error) { next(error); }
};

// 功能：从回收站恢复零件
exports.restorePart = async (req, res, next) => {
    try {
        const part = await db.Part.findOne({ where: { id: req.params.partId, orderId: req.order.id }});
        if (!part) return res.status(404).json({ error: 'Part not found' });
        part.deletedDate = null;
        await part.save();
        res.status(200).json(part);
    } catch (error) { next(error); }
};

// 功能：永久删除零件
exports.hardDeletePart = async (req, res, next) => {
    try {
        const part = await db.Part.findOne({ where: { id: req.params.partId, orderId: req.order.id }});
        if (!part) return res.status(404).json({ error: 'Part not found' });
        await part.destroy();
        res.status(204).send();
    } catch (error) { next(error); }
};
