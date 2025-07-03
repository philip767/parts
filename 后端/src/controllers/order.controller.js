// 文件路径: src/controllers/order.controller.js
'use strict';
const fs = require('fs');
const db = require('../models');
const { parseTxtFile } = require('../services/txtParser.service');
const { getInitialStock } = require('./part.controller.js');
const { Op, literal } = db.Sequelize;

exports.createOrderFromTxt = async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: 'Order file is required.' });
    try {
        const fileContent = fs.readFileSync(req.file.path);
        const parsedParts = parseTxtFile(fileContent);
        fs.unlinkSync(req.file.path);
        if (parsedParts.length === 0) return res.status(400).json({ error: 'File is empty or invalid.' });
        const partsWithExtraData = await Promise.all(
            parsedParts.map(async (part, index) => {
                const initialStock = await getInitialStock(part.partNumber);
                return { ...part, initialStock, latestStock: initialStock, lastStockCheck: new Date(), sortOrder: index };
            })
        );
        const orderName = `订单-${req.file.originalname.replace(/\.txt$/i, '')}-${new Date().toLocaleDateString('zh-CN')}`;
        const result = await db.sequelize.transaction(async (t) => {
            const order = await db.Order.create({ userId: req.user.id, name: orderName, uploadDate: new Date(), fileName: req.file.originalname }, { transaction: t });
            const partsToCreate = partsWithExtraData.map(part => ({ ...part, orderId: order.id }));
            const createdParts = await db.Part.bulkCreate(partsToCreate, { transaction: t });
            order.dataValues.parts = createdParts;
            return order;
        });
        res.status(201).json(result);
    } catch (error) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error deleting temp file on failure:", e); }
        }
        next(error);
    }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await db.Order.findAll({
      where: { userId: req.user.id, deletedDate: { [Op.is]: null } },
      attributes: { include: [[db.sequelize.fn("COUNT", db.sequelize.col("parts.id")), "partCount"]] },
      include: [{ model: db.Part, as: 'parts', attributes: [], where: { deletedDate: { [Op.is]: null } }, required: false }],
      group: ["Order.id"],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(orders);
  } catch (error) { next(error); }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await db.Order.findOne({
      where: { id: orderId, userId: req.user.id },
      include: [{ 
        model: db.Part, as: 'parts', where: { deletedDate: { [Op.is]: null } }, required: false,
        include: [{ model: db.NoteImage, as: 'images', required: false }]
      }],
      order: [
        [literal('`parts`.`sortOrder` ASC')],
        [{ model: db.Part, as: 'parts' }, 'createdAt', 'ASC'],
        [{ model: db.Part, as: 'parts' }, { model: db.NoteImage, as: 'images' }, 'createdAt', 'ASC']
      ]
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const recycledParts = await db.Part.findAll({ where: { orderId: orderId, deletedDate: { [Op.not]: null } } });
    order.dataValues.recycledParts = recycledParts;
    res.status(200).json(order);
  } catch (error) { next(error); }
};

exports.getRecycledOrders = async (req, res, next) => {
    try {
        const orders = await db.Order.findAll({ where: { userId: req.user.id, deletedDate: { [Op.not]: null } }, order: [['deletedDate', 'DESC']] });
        res.status(200).json(orders);
    } catch (error) { next(error); }
};

exports.renameOrder = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'New name is required' });
        req.order.name = name;
        await req.order.save();
        res.status(200).json(req.order);
    } catch (error) { next(error); }
};

exports.softDeleteOrder = async (req, res, next) => {
    try {
        req.order.deletedDate = new Date();
        await req.order.save();
        res.status(204).send();
    } catch (error) { next(error); }
};

exports.restoreOrder = async (req, res, next) => {
    try {
        req.order.deletedDate = null;
        await req.order.save();
        res.status(200).json(req.order);
    } catch (error) { next(error); }
};

exports.hardDeleteOrder = async (req, res, next) => {
    try {
        await req.order.destroy();
        res.status(204).send();
    } catch (error) { next(error); }
};
