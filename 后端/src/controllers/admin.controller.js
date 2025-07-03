// 文件路径: src/controllers/admin.controller.js
'use strict';
const db = require('../models');
const bcrypt = require('bcryptjs');

// 辅助函数：过滤掉密码哈希等敏感信息
const userFilter = (user) => {
    const { passwordHash, ...safeUser } = user.toJSON();
    return safeUser;
};

// --- 用户管理 ---
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await db.User.findAll({ order: [['createdAt', 'ASC']] });
        res.status(200).json(users.map(userFilter));
    } catch (error) { next(error); }
};

exports.getUserById = async (req, res, next) => {
    try {
        const user = await db.User.findByPk(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.status(200).json(userFilter(user));
    } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
    try {
        const user = await db.User.findByPk(req.params.userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const { username, email, password, role } = req.body;
        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (role && ['user', 'admin'].includes(role)) updates.role = role;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.passwordHash = await bcrypt.hash(password, salt);
        }

        await user.update(updates);
        res.status(200).json(userFilter(user));
    } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const result = await db.User.destroy({ where: { id: req.params.userId } });
        if (result === 0) return res.status(404).json({ error: 'User not found.' });
        res.status(204).send();
    } catch (error) { next(error); }
};

// --- 订单管理 (管理员视角) ---
exports.getAllOrders = async (req, res, next) => {
    try {
        const orders = await db.Order.findAll({
            include: [
                { model: db.User, attributes: ['id', 'username', 'email'] },
                { model: db.Part, as: 'parts', attributes: ['id'] } // 只包含零件ID，用于计数
            ],
            order: [['createdAt', 'DESC']]
        });
        // 手动计算 partCount
        const ordersWithCount = orders.map(order => {
            const orderJson = order.toJSON();
            orderJson.partCount = orderJson.parts ? orderJson.parts.length : 0;
            delete orderJson.parts; // 从最终结果中移除 parts 数组
            return orderJson;
        });
        res.status(200).json(ordersWithCount);
    } catch (error) { next(error); }
};

exports.getAdminOrderDetails = async (req, res, next) => {
    try {
        const order = await db.Order.findByPk(req.params.orderId, {
            include: [
                { model: db.User, attributes: ['id', 'username', 'email'] },
                { 
                    model: db.Part, as: 'parts', required: false,
                    include: [{ model: db.NoteImage, as: 'images', required: false }]
                }
            ],
            order: [[{ model: db.Part, as: 'parts' }, 'sortOrder', 'ASC NULLS LAST']]
        });
        if (!order) return res.status(404).json({ error: 'Order not found.' });
        res.status(200).json(order);
    } catch (error) { next(error); }
};

exports.deleteOrderByAdmin = async (req, res, next) => {
    try {
        const result = await db.Order.destroy({ where: { id: req.params.orderId } });
        if (result === 0) return res.status(404).json({ error: 'Order not found.' });
        res.status(204).send();
    } catch (error) { next(error); }
};
