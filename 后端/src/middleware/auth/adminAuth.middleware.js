// 文件路径: src/middleware/adminAuth.middleware.js
const db = require('../models');

// 这是一个简单的权限检查中间件
// 它假设请求已经经过了 JWT 认证 (req.user 已经存在)
exports.adminProtect = async (req, res, next) => {
    try {
        // 确保用户已登录
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }

        // 从数据库重新加载用户，确保角色信息最新且安全
        const user = await db.User.findByPk(req.user.id);

        if (user && user.role === 'admin') {
            next(); // 用户是管理员，允许通过
        } else {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
    } catch (error) {
        console.error("[AdminAuth Middleware] Error during admin check:", error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};
