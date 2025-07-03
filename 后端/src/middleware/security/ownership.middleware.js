const db = require('../models');

exports.checkOrderOwnership = async (req, res, next) => {
    try {
        const order = await db.Order.findOne({
            where: { id: req.params.orderId, userId: req.user.id }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found or you do not have permission to access it.' });
        }
        req.order = order; // Attach order to request object
        next();
    } catch (error) {
        next(error);
    }
};
