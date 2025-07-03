// 文件路径: src/controllers/memo.controller.js
'use strict';
const db = require('../models');
const { getInitialStock } = require('./part.controller.js');

const parsePartInfoFromTask = (task) => {
    const match = task.match(/添加零件\s+(.+?)\s+(.+?)\s+数量\s*(\d+)/i);
    if (match && match.length === 4) {
        return { partNumber: match[1].trim(), partName: match[2].trim(), quantity: parseInt(match[3], 10) };
    }
    return null;
};

exports.getAllMemos = async (req, res, next) => {
    try {
        const memos = await db.Memo.findAll({ where: { userId: req.user.id }, order: [['isCompleted', 'ASC'], ['dueDateTime', 'ASC']] });
        res.status(200).json(memos);
    } catch (error) { next(error); }
};

exports.createMemo = async (req, res, next) => {
    try {
        const { task, dueDateTime, partNumber, orderName, taskType } = req.body;
        if (!task || !dueDateTime) return res.status(400).json({ error: 'Task and dueDateTime are required.' });
        const newMemo = await db.Memo.create({
            task, dueDateTime, partNumber: partNumber || null, orderName: orderName || null,
            taskType: taskType || 'reminder', userId: req.user.id
        });
        res.status(201).json(newMemo);
    } catch (error) { next(error); }
};

exports.executeMemoTask = async (req, res, next) => {
    try {
        const { memoId } = req.params;
        const userId = req.user.id;
        const memo = await db.Memo.findOne({ where: { id: memoId, userId } });
        if (!memo) return res.status(404).json({ error: 'Memo not found.' });
        if (memo.isCompleted) return res.status(400).json({ error: 'Task already completed.' });
        if (memo.taskType !== 'add_part') return res.status(400).json({ error: 'Task not executable.' });
        if (!memo.orderName) return res.status(400).json({ error: 'Associated order name is missing.' });
        
        const targetOrder = await db.Order.findOne({ where: { name: memo.orderName, userId } });
        if (!targetOrder) return res.status(404).json({ error: `Order "${memo.orderName}" not found.` });

        const partInfo = parsePartInfoFromTask(memo.task);
        if (!partInfo) return res.status(400).json({ error: 'Failed to parse part info.' });

        const initialStock = await getInitialStock(partInfo.partNumber);
        await db.Part.create({ ...partInfo, orderId: targetOrder.id, initialStock, latestStock: initialStock, lastStockCheck: new Date(), isMonitored: true });
        
        memo.isCompleted = true;
        await memo.save();
        res.status(200).json({ message: 'Task executed successfully.', completedMemo: memo });
    } catch (error) { next(error); }
};

exports.updateMemo = async (req, res, next) => {
    try {
        const { memoId } = req.params;
        const { isCompleted } = req.body;
        if (typeof isCompleted !== 'boolean') return res.status(400).json({ error: 'isCompleted must be a boolean.' });
        const memo = await db.Memo.findOne({ where: { id: memoId, userId: req.user.id } });
        if (!memo) return res.status(404).json({ error: 'Memo not found.' });
        memo.isCompleted = isCompleted;
        await memo.save();
        res.status(200).json(memo);
    } catch (error) { next(error); }
};

exports.deleteMemo = async (req, res, next) => {
    try {
        const memo = await db.Memo.findOne({ where: { id: req.params.memoId, userId: req.user.id } });
        if (!memo) return res.status(404).json({ error: 'Memo not found.' });
        await memo.destroy();
        res.status(204).send();
    } catch (error) { next(error); }
};
