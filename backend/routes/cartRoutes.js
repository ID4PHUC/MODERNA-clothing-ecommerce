const router = require('express').Router();
const cartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', authMiddleware, cartController.getCart);
router.post('/', authMiddleware, cartController.addToCart);
router.post('/update', authMiddleware, cartController.updateCart);
router.post('/remove', authMiddleware, cartController.removeFromCart);
router.post('/checkout', authMiddleware, cartController.checkout);
router.delete('/clear', authMiddleware, cartController.clearCart);
router.post('/momo-ipn', cartController.momoIPN);
module.exports = router;