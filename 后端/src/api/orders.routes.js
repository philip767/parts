const router = require('express').Router();
const orderController = require('../controllers/order.controller');
const partController = require('../controllers/part.controller');
const imageController = require('../controllers/image.controller');
const { checkOrderOwnership } = require('../middleware/ownership.middleware');
const { uploadTxt, uploadImage } = require('../middleware/upload.middleware');

// Order level
router.post('/', uploadTxt.single('orderFile'), orderController.createOrderFromTxt);
router.get('/', orderController.getOrders);
router.get('/recycled', orderController.getRecycledOrders);

// Apply ownership middleware for specific order routes
router.use('/:orderId', checkOrderOwnership);

router.get('/:orderId', orderController.getOrderDetails);
router.put('/:orderId/rename', orderController.renameOrder);
router.delete('/:orderId', orderController.softDeleteOrder);
router.post('/:orderId/restore', orderController.restoreOrder);
router.delete('/:orderId/permanent', orderController.hardDeleteOrder);

// Part level
router.post('/:orderId/parts', partController.createPart);
router.put('/:orderId/parts/:partId', partController.updatePart);
router.delete('/:orderId/parts/:partId', partController.softDeletePart);
router.post('/:orderId/parts/:partId/restore', partController.restorePart);
router.delete('/:orderId/parts/:partId/permanent', partController.hardDeletePart);

// Image level
router.post('/:orderId/parts/:partId/images', uploadImage.single('noteImage'), imageController.uploadImage);
router.delete('/:orderId/parts/:partId/images/:imageId', imageController.deleteImage);

module.exports = router;
