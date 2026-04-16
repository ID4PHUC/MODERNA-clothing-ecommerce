const router = require('express').Router();
const orderCtrl = require('../controllers/orderController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware'); 
router.post('/', authMiddleware, orderCtrl.createOrder);

// Get orders for logged-in user
router.get('/', authMiddleware, orderCtrl.getUserOrders);

// Get all orders
router.get('/all', authMiddleware, adminOnly, orderCtrl.getAllOrders);

// Get one order
router.get('/:id', authMiddleware, orderCtrl.getOrderById);

// Update order status
router.patch('/:id/status', authMiddleware, adminOnly, orderCtrl.updateOrderStatus);

// Cancel order
router.put('/:id/cancel', authMiddleware, orderCtrl.cancelUserOrder);

module.exports = router;