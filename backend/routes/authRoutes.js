const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// ---CẤU HÌNH CÁC LỚP KHIÊN BẢO VỆ (RATE LIMIT) ---

// 1. Chống dò mật khẩu (Dành cho Login)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Mỗi IP chỉ được thử sai 5 lần trong 15p
  message: { error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút!" },
  standardHeaders: true, 
  legacyHeaders: false,
});

// 2. Chống tạo tài khoản rác (Dành cho Register)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3, // Mỗi IP chỉ được tạo 3 tài khoản mỗi giờ
  message: { error: "Hệ thống phát hiện dấu hiệu spam. Vui lòng thử lại sau 1 giờ!" }
});

// ================= PUBLIC ROUTES =================

// Đăng ký (Có bảo vệ chống Bot)
router.post('/register', registerLimiter, authCtrl.register);

// Đăng nhập (Có bảo vệ chống dò mật khẩu)
router.post('/login', loginLimiter, authCtrl.login);

// Quên mật khẩu & Reset
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/reset-password', authCtrl.resetPassword);

// ================= PROTECTED ROUTES (Cần Token) =================

// Cập nhật thông tin cá nhân (User tự làm)
router.put('/profile', authMiddleware, authCtrl.updateProfile);

// ================= ADMIN ONLY ROUTES (Token + Quyền Admin) =================

// 1. Lấy danh sách tất cả người dùng (Chỉ Admin)
router.get('/users', authMiddleware, adminOnly, authCtrl.getAllUsers);

// 2. Quản lý tài khoản (Xóa, Sửa, Nâng/Hạ cấp)
router.get('/users/:id', authMiddleware, adminOnly, authCtrl.getUserById);
router.put('/users/:id', authMiddleware, adminOnly, authCtrl.updateUser);
router.delete('/users/:id', authMiddleware, adminOnly, authCtrl.deleteUser);
router.post('/users/:id/promote', authMiddleware, adminOnly, authCtrl.promoteUser);
router.post('/users/:id/demote', authMiddleware, adminOnly, authCtrl.demoteUser);

module.exports = router;