const router = require('express').Router();
const reviewCtrl = require('../controllers/reviewController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// 1. Lấy tất cả đánh giá (Admin dùng)
router.get('/', reviewCtrl.getAllReviews);

// 2. LƯU ĐÁNH GIÁ MỚI (Khách hàng dùng)
router.post('/', authMiddleware, reviewCtrl.createReview); 

// 3. Xóa đánh giá (Chỉ Admin mới có quyền)
router.delete('/:id', authMiddleware, adminOnly, reviewCtrl.deleteReview);

module.exports = router;