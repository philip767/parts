// 文件路径: src/controllers/image.controller.js
'use strict';
const db = require('../models');
const fs = require('fs');
const path = require('path');

const MAX_NOTE_IMAGES = 5;

exports.uploadImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image file is required.' });

        const { orderId, partId } = req.params;
        const part = await db.Part.findOne({
            where: { id: partId, orderId: req.order.id }, // 确保零件属于该订单
            include: { model: db.NoteImage, as: 'images' }
        });

        if (!part) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Part not found' });
        }

        if (part.images.length >= MAX_NOTE_IMAGES) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: `Cannot upload more than ${MAX_NOTE_IMAGES} images.` });
        }

        const imageUrlOrPath = `${process.env.SERVER_BASE_URL}/uploads/${req.file.filename}`;

        const newImage = await db.NoteImage.create({
            partId: part.id,
            imageUrlOrPath: imageUrlOrPath,
            imageName: req.file.originalname,
            imageType: req.file.mimetype,
        });

        res.status(201).json(newImage);
    } catch (error) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) { 
          try { fs.unlinkSync(req.file.path); } catch (e) { console.error("Error cleaning up uploaded file on failure:", e); }
        }
        next(error);
    }
};

exports.deleteImage = async (req, res, next) => {
    try {
        const { imageId } = req.params;
        // 在查询时就加入权限验证
        const image = await db.NoteImage.findOne({
            where: { id: imageId },
            include: [{ model: db.Part, as: 'part', required: true, include: [{ model: db.Order, as: 'order', where: { userId: req.user.id } }] }]
        });
        
        if (!image) return res.status(404).json({ error: 'Image not found or you do not have permission.' });

        const filename = path.basename(image.imageUrlOrPath);
        const uploadsDir = path.join(__dirname, '../../uploads');
        const filePath = path.join(uploadsDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await image.destroy();
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
