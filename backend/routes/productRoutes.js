const router = require('express').Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const uploadCloud = require('../middleware/cloudinary');

// --- 1. PUBLIC ROUTES ---
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// --- 2. ADMIN ROUTES (Phải là Admin mới được làm) ---

// A. THÊM SẢN PHẨM
router.post(
  '/',
  authMiddleware, // Kiểm tra đăng nhập
  adminOnly,      // Kiểm tra quyền Admin
  (req, res, next) => {
    uploadCloud.array('images', 10)(req, res, function (err) {
      if (err) {
        console.error(' LỖI UPLOAD KHI THÊM:', err);
        return res.status(500).json({ error: 'Lỗi upload ảnh: ' + err.message });
      }
      next();
    });
  },
  productController.addProduct
);

// B. CẬP NHẬT SẢN PHẨM
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  (req, res, next) => {
    uploadCloud.array('images', 10)(req, res, function (err) {
      if (err) {
        console.error('LỖI UPLOAD KHI SỬA:', err);
        return res.status(500).json({ error: 'Lỗi upload ảnh: ' + err.message });
      }
      next();
    });
  },
  productController.updateProduct
);

// C. XÓA SẢN PHẨM
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  productController.deleteProduct
);

module.exports = router;