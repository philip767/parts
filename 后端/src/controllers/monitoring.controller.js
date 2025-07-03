// 文件路径: src/controllers/monitoring.controller.js
'use strict';
const db = require('../models');

exports.updateMonitoringSettings = async (req, res, next) => {
    try {
        const { partId } = req.params;
        const { isMonitored, stockCheckInterval } = req.body;
        
        // 查询这个零件，并确保它属于当前登录的用户，保证安全
        const part = await db.Part.findOne({ 
            where: { id: partId },
            include: [{ model: db.Order, where: { userId: req.user.id } }]
        });

        if (!part) {
            return res.status(404).json({ error: 'Part not found or you do not have permission.' });
        }

        const updates = {};
        // 验证并添加要更新的字段
        if (typeof isMonitored === 'boolean') {
            updates.isMonitored = isMonitored;
        }
        // 确保间隔时间是有效的数字，并且至少为60秒
        if (typeof stockCheckInterval === 'number' && stockCheckInterval >= 60) {
            updates.stockCheckInterval = stockCheckInterval;
        }

        // 如果有需要更新的字段，才执行数据库操作
        if (Object.keys(updates).length > 0) {
            await part.update(updates);
        }
        
        // 返回更新后的完整零件对象给前端
        const updatedPart = await db.Part.findByPk(partId);
        res.status(200).json(updatedPart);

    } catch (error) {
        console.error("[Monitoring Controller] Error updating monitoring settings:", error);
        next(error);
    }
};
