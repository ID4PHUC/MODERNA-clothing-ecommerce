const router = require('express').Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
//const upload = require('../middleware/upload');
const uploadCloud = require('../middleware/cloudinary');

// Public
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin - Thêm sản phẩm
router.post(
  '/',
  authMiddleware,
  adminOnly,
  (req, res, next) => {
    // Gọi middleware uploadCloud
    uploadCloud.array('images', 10)(req, res, function (err) {
      if (err) {
        // NẾU CÓ LỖI Ở ĐÂY, NÓ SẼ HIỆN RA TERMINAL CỦA ÔNG
        console.error('🔥 LỖI UPLOAD CLOUDINARY/MULTER:', err);
        return res.status(500).json({ error: 'Lỗi upload ảnh: ' + err.message });
      }
      // Nếu không lỗi thì mới chạy vào Controller
      next();
    });
  },
  productController.addProduct
);

// Admin - Cập nhật (Cũng dùng array)
router.put(
  '/:id',
  authMiddleware,
  adminOnly,
  //upload.array('images', 10),
  uploadCloud.array('images', 10), // Sử dụng middleware Cloudinary
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
