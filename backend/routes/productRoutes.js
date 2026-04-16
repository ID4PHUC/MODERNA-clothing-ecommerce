const router = require('express').Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Public
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin - Thêm sản phẩm (Dùng upload.array thay vì single)
router.post(
  '/',
  authMiddleware,
  adminOnly,
  upload.array('images', 10), // Tên field phải khớp với frontend gửi lên
  productController.addProduct
);

// Admin - Cập nhật (Cũng dùng array)
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  upload.array('images', 10),
  productController.updateProduct
);

// Admin - Xoá sản phẩm
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  productController.deleteProduct
);

module.exports = router;
