// 文件路径: src/services/stockScheduler.service.js

const cron = require('node-cron');
const { Op, literal } = require('sequelize');
const db = require('../models');
const Lj = require('./lj.model.js');
const mailService = require('./mail.service.js');
const { logInfo, logError, logWarn } = require('../middleware/logger.middleware');

/**
 * 安全地查询库存信息，确保不修改远程数据库
 * @param {string} partNumber - 零件号
 * @returns {Promise<number|null>} 库存数量或null
 */
const safeQueryStock = async (partNumber) => {
    try {
        if (!partNumber || typeof partNumber !== 'string') {
            logWarn('库存查询：无效的零件号', { partNumber });
            return null;
        }

        // 安全检查：验证零件号格式
        if (partNumber.length > 100 || /[;'\"\\]/.test(partNumber)) {
            logError('库存查询：零件号包含危险字符', { partNumber });
            return null;
        }

        logInfo('库存查询：开始查询远程数据库', { partNumber });
        
        const inventoryPart = await Lj.findByPk(partNumber.trim(), {
            attributes: ['stockQuantity'],
            lock: false // 确保只读操作
        });

        const currentStock = inventoryPart ? inventoryPart.stockQuantity : null;
        
        logInfo('库存查询：查询完成', { 
            partNumber, 
            currentStock,
            found: !!inventoryPart 
        });

        return currentStock;
    } catch (error) {
        logError('库存查询：查询失败', { 
            partNumber, 
            error: error.message,
            stack: error.stack 
        });
        return null;
    }
};

// --- 任务一：检查库存水平 ---
const checkStockLevels = async () => {
    const taskStart = new Date();
    logInfo('库存监控任务开始', { taskStart: taskStart.toISOString() });
    
    try {
        const partsToMonitor = await db.Part.findAll({
            where: {
                isMonitored: true,
                deletedDate: { [Op.is]: null },
                lastStockCheck: {
                    // 使用 MySQL 兼容的语法
                    [Op.lt]: literal(`DATE_SUB(NOW(), INTERVAL stockCheckInterval SECOND)`)
                }
            },
            include: [{ 
                model: db.Order, 
                where: { deletedDate: { [Op.is]: null } },
                include: [{ model: db.User, attributes: ['id', 'username', 'email'] }] 
            }] 
        });

        if (partsToMonitor.length === 0) {
            logInfo('库存监控：没有需要检查的零件');
            return;
        }

        logInfo('库存监控：开始检查零件库存', { 
            partCount: partsToMonitor.length 
        });

        let successCount = 0;
        let errorCount = 0;
        let alertCount = 0;

        for (const part of partsToMonitor) {
            try {
                // 安全查询库存
                const currentStock = await safeQueryStock(part.partNumber);
                
                if (currentStock !== null) {
                    // 检查库存是否增加
                    if (part.latestStock !== null && currentStock > part.latestStock) {
                        logInfo('库存监控：检测到库存增加', {
                            partNumber: part.partNumber,
                            oldStock: part.latestStock,
                            newStock: currentStock,
                            increase: currentStock - part.latestStock
                        });

                        try {
                            await mailService.sendStockAlertEmail(part.Order.User, part, currentStock);
                            alertCount++;
                            logInfo('库存监控：邮件通知发送成功', {
                                partNumber: part.partNumber,
                                userEmail: part.Order.User.email
                            });
                        } catch (emailError) {
                            logError('库存监控：邮件通知发送失败', {
                                partNumber: part.partNumber,
                                userEmail: part.Order.User.email,
                                error: emailError.message
                            });
                        }
                    }

                    // 更新本地数据库中的库存信息（只更新本地表，不修改远程数据库）
                    await part.update({ 
                        latestStock: currentStock, 
                        lastStockCheck: new Date() 
                    });
                    
                    successCount++;
                } else {
                    logWarn('库存监控：无法获取库存信息', {
                        partNumber: part.partNumber,
                        partId: part.id
                    });
                }
            } catch (partError) {
                errorCount++;
                logError('库存监控：处理单个零件时出错', {
                    partNumber: part.partNumber,
                    partId: part.id,
                    error: partError.message,
                    stack: partError.stack
                });
            }
        }

        const taskEnd = new Date();
        const duration = taskEnd.getTime() - taskStart.getTime();
        
        logInfo('库存监控任务完成', {
            totalParts: partsToMonitor.length,
            successCount,
            errorCount,
            alertCount,
            duration: `${duration}ms`,
            taskEnd: taskEnd.toISOString()
        });

    } catch (error) {
        logError('库存监控任务：致命错误', {
            error: error.message,
            stack: error.stack
        });
    }
};

// --- 任务二：检查到期的备忘录 (带有详细的诊断日志) ---
const checkDueMemos = async () => {
    const now = new Date();
    logInfo('备忘录检查任务开始', { taskStart: now.toISOString() });

    try {
        const dueMemos = await db.Memo.findAll({
            where: {
                isCompleted: false,
                isReminderSent: false,
                dueDateTime: { [Op.lte]: now }
            },
            include: [{ model: db.User, attributes: ['id', 'username', 'email'] }]
        });

        if (dueMemos.length === 0) {
            logInfo('备忘录检查：没有到期的备忘录');
            return;
        }

        logInfo('备忘录检查：找到到期的备忘录', { 
            memoCount: dueMemos.length 
        });

        let successCount = 0;
        let errorCount = 0;

        for (const memo of dueMemos) {
            try {
                logInfo('备忘录检查：处理备忘录', {
                    memoId: memo.id,
                    task: memo.task,
                    userId: memo.User.id,
                    userEmail: memo.User.email
                });
                
                // 发送邮件通知
                await mailService.sendMemoReminderEmail(memo.User, memo);
                
                // 更新备忘录状态（只更新本地数据库）
                await memo.update({ isReminderSent: true });
                
                successCount++;
                logInfo('备忘录检查：备忘录处理成功', {
                    memoId: memo.id,
                    task: memo.task
                });

            } catch (memoError) { 
                errorCount++;
                logError('备忘录检查：处理备忘录失败', {
                    memoId: memo.id,
                    task: memo.task,
                    error: memoError.message,
                    stack: memoError.stack
                });
            }
        }

        logInfo('备忘录检查任务完成', {
            totalMemos: dueMemos.length,
            successCount,
            errorCount
        });

    } catch (error) { 
        logError('备忘录检查任务：致命错误', {
            error: error.message,
            stack: error.stack
        });
    }
};

// --- 启动所有定时任务 ---
exports.start = () => {
    // 每分钟执行一次这两个检查任务
    cron.schedule('* * * * *', () => {
        checkStockLevels();
        checkDueMemos();
    });
    
    logInfo('定时任务调度器已启动', {
        schedule: '每分钟执行一次',
        tasks: ['库存监控', '备忘录检查']
    });
    
    console.log("✅ Scheduler started. Will check for stocks and due memos every minute.");
};