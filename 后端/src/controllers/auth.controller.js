// 文件路径: src/controllers/auth.controller.js
'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;
const linuxUserService = require('../services/linuxUser.service.js');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

exports.register = async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码是必填项。' });
    }
    if (!/^[a-z_][a-z0-9_-]{2,31}$/i.test(username)) {
        return res.status(400).json({ error: '用户名格式无效。必须以字母或下划线开头，长度为3-32位。' });
    }

    const email = `${username.toLowerCase()}@chengzichat.cn`;

    try {
        const existingUser = await User.findOne({ where: { [db.Sequelize.Op.or]: [{ username }, { email }] } });
        if (existingUser) {
            return res.status(409).json({ error: '该用户名已被注册。' });
        }
        
        let newUser;
        await db.sequelize.transaction(async (t) => {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            newUser = await User.create({ username, email, passwordHash }, { transaction: t });
            await linuxUserService.createEmailAccount(username, password);
        });

        const token = generateToken(newUser.id);
        res.status(201).json({
            userId: newUser.id,
            username: newUser.username,
            email: newUser.email,
            token,
            role: newUser.role,
            emailInfo: {
                address: newUser.email,
                message: "系统已为您自动创建此邮箱，用于接收所有通知。您的邮箱密码与您的网站登录密码相同，请妥善保管。"
            }
        });
    } catch (error) {
        console.error("Registration process failed:", error);
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { loginIdentifier, password } = req.body; 
        if (!loginIdentifier || !password) {
            return res.status(400).json({ error: '请输入账户和密码。' });
        }
        const user = await User.findOne({
            where: { [db.Sequelize.Op.or]: [{ email: loginIdentifier }, { username: loginIdentifier }] },
        });
        if (user && (await bcrypt.compare(password, user.passwordHash))) {
            const token = generateToken(user.id);
            res.status(200).json({
                userId: user.id,
                username: user.username,
                email: user.email,
                token,
                role: user.role
            });
        } else {
            res.status(401).json({ error: '账户或密码错误。' });
        }
    } catch (error) {
        next(error);
    }
};
