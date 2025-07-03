// 文件路径: src/controllers/inventory.controller.js
'use strict';
const Lj = require('../services/lj.model.js'); // 引入库存模型
const { Op } = require('sequelize');
const { logInfo, logError } = require('../middleware/logger.middleware');
const { 
    validateQuery, 
    validatePartNumber, 
    createSafeQueryOptions, 
    logSecurityEvent,
    SECURITY_CONFIG 
} = require('../config/security.config');



/**
 * 功能1: 模糊搜索，返回简化列表 (零件号, 库存数) - 用于快速预览
 * 安全：只进行SELECT查询，不修改任何数据
 */
exports.searchInventory = async (req, res, next) => {
    const { query } = req.query;
    
    // 参数验证
    if (!query || !query.trim()) {
        return res.status(400).json({ 
            error: '查询参数不能为空',
            code: 'INVALID_QUERY'
        });
    }
    
    // 安全检查
    const validation = validateQuery(query.trim());
    if (!validation.isValid) {
        logSecurityEvent('SECURITY_VIOLATION', {
            type: 'INVALID_QUERY',
            query: query.trim(),
            ip: req.ip,
            reason: validation.reason
        });
        return res.status(400).json({ 
            error: validation.reason || '查询参数包含无效字符',
            code: 'INVALID_QUERY_CHARS'
        });
    }
    
    try {
        logInfo('执行库存查询', { 
            query: query.trim(), 
            userId: req.user?.id,
            ip: req.ip 
        });
        
        const results = await Lj.findAll(createSafeQueryOptions({
            attributes: ['partNumber', 'stockQuantity'],
            where: {
                partNumber: {
                    [Op.like]: `%${query.trim()}%`
                }
            },
            limit: 5
        }));
        
        logInfo('库存查询成功', { 
            query: query.trim(), 
            resultCount: results.length 
        });
        
        res.status(200).json({
            success: true,
            data: results,
            count: results.length
        });
        
    } catch (error) { 
        logError('库存查询失败', { 
            query: query.trim(), 
            error: error.message,
            stack: error.stack 
        });
        
        // 不暴露详细的数据库错误信息
        res.status(500).json({ 
            error: '库存查询服务暂时不可用，请稍后重试',
            code: 'INVENTORY_QUERY_ERROR'
        });
    }
};

/**
 * 功能2: 模糊搜索，返回定制的完整详情列表 (用于"查询零件信息"按钮)
 * 安全：只进行SELECT查询，不修改任何数据
 */
exports.searchFullDetails = async (req, res, next) => {
    const { query } = req.query;
    
    // 参数验证
    if (!query || !query.trim()) {
        return res.status(400).json({ 
            error: '查询参数不能为空',
            code: 'INVALID_QUERY'
        });
    }
    
    // 安全检查
    const validation = validateQuery(query.trim());
    if (!validation.isValid) {
        logSecurityEvent('SECURITY_VIOLATION', {
            type: 'INVALID_QUERY',
            query: query.trim(),
            ip: req.ip,
            reason: validation.reason
        });
        return res.status(400).json({ 
            error: validation.reason || '查询参数包含无效字符',
            code: 'INVALID_QUERY_CHARS'
        });
    }
    
    try {
        logInfo('执行库存详情查询', { 
            query: query.trim(), 
            userId: req.user?.id,
            ip: req.ip 
        });
        
        const results = await Lj.findAll(createSafeQueryOptions({
            attributes: [
                'partNumber', 
                'partNameCn', 
                'vehicleModel', 
                'origin', 
                'unit', 
                'stockQuantity',
                'notes'
            ],
            where: {
                partNumber: {
                    [Op.like]: `%${query.trim()}%`
                }
            },
            limit: 5
        }));
        
        logInfo('库存详情查询成功', { 
            query: query.trim(), 
            resultCount: results.length 
        });
        
        res.status(200).json({
            success: true,
            data: results,
            count: results.length
        });
        
    } catch (error) { 
        logError('库存详情查询失败', { 
            query: query.trim(), 
            error: error.message,
            stack: error.stack 
        });
        
        res.status(500).json({ 
            error: '库存详情查询服务暂时不可用，请稍后重试',
            code: 'INVENTORY_DETAILS_ERROR'
        });
    }
};

/**
 * 功能3: 精确查询单个零件详情
 * 安全：只进行SELECT查询，不修改任何数据
 */
exports.getPartDetails = async (req, res, next) => {
    const { partNumber } = req.params;
    
    // 参数验证
    if (!partNumber || !partNumber.trim()) {
        return res.status(400).json({ 
            error: '零件号不能为空',
            code: 'INVALID_PART_NUMBER'
        });
    }
    
    // 安全检查
    const validation = validatePartNumber(partNumber.trim());
    if (!validation.isValid) {
        logSecurityEvent('SECURITY_VIOLATION', {
            type: 'INVALID_PART_NUMBER',
            partNumber: partNumber.trim(),
            ip: req.ip,
            reason: validation.reason
        });
        return res.status(400).json({ 
            error: validation.reason || '零件号包含无效字符',
            code: 'INVALID_PART_NUMBER_CHARS'
        });
    }
    
    try {
        logInfo('执行零件详情查询', { 
            partNumber: partNumber.trim(), 
            userId: req.user?.id,
            ip: req.ip 
        });
        
        const result = await Lj.findByPk(partNumber.trim(), createSafeQueryOptions({
            attributes: [
                'partNumber', 
                'partNameCn', 
                'vehicleModel', 
                'origin', 
                'unit', 
                'stockQuantity',
                'notes'
            ]
        }));
        
        if (result) {
            logInfo('零件详情查询成功', { 
                partNumber: partNumber.trim() 
            });
            
            res.status(200).json({
                success: true,
                data: result
            });
        } else {
            logInfo('零件未找到', { 
                partNumber: partNumber.trim() 
            });
            
            res.status(404).json({ 
                error: `零件号 '${partNumber.trim()}' 在库存中未找到`,
                code: 'PART_NOT_FOUND'
            });
        }
        
    } catch (error) { 
        logError('零件详情查询失败', { 
            partNumber: partNumber.trim(), 
            error: error.message,
            stack: error.stack 
        });
        
        res.status(500).json({ 
            error: '零件详情查询服务暂时不可用，请稍后重试',
            code: 'PART_DETAILS_ERROR'
        });
    }
};
