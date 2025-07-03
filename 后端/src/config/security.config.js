'use strict';

/**
 * 安全配置常量
 */
const SECURITY_CONFIG = {
    // 远程数据库安全策略
    REMOTE_DB: {
        // 只允许的操作类型
        ALLOWED_OPERATIONS: ['SELECT', 'READ'],
        
        // 禁止的操作类型
        FORBIDDEN_OPERATIONS: [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
            'TRUNCATE', 'EXEC', 'EXECUTE', 'SP_', 'XP_'
        ],
        
        // 最大查询结果数量
        MAX_RESULTS: 100,
        
        // 查询超时时间（毫秒）
        QUERY_TIMEOUT: 10000,
        
        // 最大查询字符串长度
        MAX_QUERY_LENGTH: 100,
        
        // 危险字符模式
        DANGEROUS_PATTERNS: [
            /;/,           // 分号
            /--/,          // SQL注释
            /\/\*/,        // 多行注释开始
            /\*\//,        // 多行注释结束
            /union/i,      // UNION
            /drop/i,       // DROP
            /delete/i,     // DELETE
            /insert/i,     // INSERT
            /update/i,     // UPDATE
            /alter/i,      // ALTER
            /create/i,     // CREATE
            /exec/i,       // EXEC
            /xp_/i,        // 扩展存储过程
            /sp_/i,        // 系统存储过程
            /waitfor/i,    // WAITFOR
            /delay/i,      // DELAY
            /benchmark/i,  // BENCHMARK
            /sleep/i       // SLEEP
        ]
    },
    
    // API限流配置
    RATE_LIMIT: {
        // 库存查询限流
        INVENTORY_SEARCH: {
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 100, // 最大请求数
            message: '库存查询过于频繁，请稍后再试'
        },
        
        // 认证限流
        AUTH: {
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 5, // 最大登录尝试次数
            message: '登录尝试次数过多，请15分钟后再试'
        }
    },
    
    // 缓存配置
    CACHE: {
        // 库存查询缓存时间（秒）
        INVENTORY_SEARCH: 180, // 3分钟
        INVENTORY_DETAILS: 300, // 5分钟
        PART_DETAILS: 600, // 10分钟
    }
};

/**
 * 验证查询参数的安全性
 * @param {string} query - 查询字符串
 * @returns {Object} 验证结果 { isValid: boolean, reason?: string }
 */
const validateQuery = (query) => {
    // 基本验证
    if (!query || typeof query !== 'string') {
        return { isValid: false, reason: '查询参数不能为空或类型错误' };
    }
    
    const trimmedQuery = query.trim();
    
    // 长度验证
    if (trimmedQuery.length > SECURITY_CONFIG.REMOTE_DB.MAX_QUERY_LENGTH) {
        return { 
            isValid: false, 
            reason: `查询参数过长，最大长度: ${SECURITY_CONFIG.REMOTE_DB.MAX_QUERY_LENGTH}` 
        };
    }
    
    // 危险字符验证
    for (const pattern of SECURITY_CONFIG.REMOTE_DB.DANGEROUS_PATTERNS) {
        if (pattern.test(trimmedQuery)) {
            return { 
                isValid: false, 
                reason: `查询参数包含危险字符: ${pattern.source}` 
            };
        }
    }
    
    return { isValid: true };
};

/**
 * 验证零件号的安全性
 * @param {string} partNumber - 零件号
 * @returns {Object} 验证结果 { isValid: boolean, reason?: string }
 */
const validatePartNumber = (partNumber) => {
    // 基本验证
    if (!partNumber || typeof partNumber !== 'string') {
        return { isValid: false, reason: '零件号不能为空或类型错误' };
    }
    
    const trimmedPartNumber = partNumber.trim();
    
    // 长度验证
    if (trimmedPartNumber.length > SECURITY_CONFIG.REMOTE_DB.MAX_QUERY_LENGTH) {
        return { 
            isValid: false, 
            reason: `零件号过长，最大长度: ${SECURITY_CONFIG.REMOTE_DB.MAX_QUERY_LENGTH}` 
        };
    }
    
    // 危险字符验证
    for (const pattern of SECURITY_CONFIG.REMOTE_DB.DANGEROUS_PATTERNS) {
        if (pattern.test(trimmedPartNumber)) {
            return { 
                isValid: false, 
                reason: `零件号包含危险字符: ${pattern.source}` 
            };
        }
    }
    
    return { isValid: true };
};

/**
 * 创建安全的查询选项
 * @param {Object} options - 原始查询选项
 * @returns {Object} 安全的查询选项
 */
const createSafeQueryOptions = (options = {}) => {
    return {
        ...options,
        // 确保只读操作
        lock: false,
        skipLocked: false,
        // 限制结果数量
        limit: Math.min(options.limit || 5, SECURITY_CONFIG.REMOTE_DB.MAX_RESULTS),
        // 设置超时
        timeout: SECURITY_CONFIG.REMOTE_DB.QUERY_TIMEOUT
    };
};

/**
 * 记录安全事件
 * @param {string} eventType - 事件类型
 * @param {Object} details - 事件详情
 */
const logSecurityEvent = (eventType, details) => {
    const { logWarn, logError } = require('../middleware/logger.middleware');
    
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...details
    };
    
    if (eventType === 'SECURITY_WARNING') {
        logWarn('安全警告', event);
    } else if (eventType === 'SECURITY_VIOLATION') {
        logError('安全违规', event);
    }
};

module.exports = {
    SECURITY_CONFIG,
    validateQuery,
    validatePartNumber,
    createSafeQueryOptions,
    logSecurityEvent
}; 