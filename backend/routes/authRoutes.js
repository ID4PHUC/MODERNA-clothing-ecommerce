const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

// ================= PUBLIC ROUTES =================
// Đăng ký tài khoản mới (mặc định là User thường)
router.post('/register', authCtrl.register);

// Đăng nhập (trả về Token và thông tin User)
router.post('/login', authCtrl.login);

// ================= ADMIN ONLY ROUTES =================
// Tất cả các route bên dưới đều yêu cầu phải có Token (authMiddleware) 
// và phải có quyền Admin (adminOnly) mới truy cập được.

// 1. Lấy danh sách tất cả người dùng trong hệ thống
router.get('/users', authMiddleware, adminOnly, authCtrl.getAllUsers);

// 2. Xóa người dùng theo ID (Đã có logic chặn xóa Root Admin trong Controller)
router.delete('/users/:id', authMiddleware, adminOnly, authCtrl.deleteUser);

// 3. Cập nhật thông tin người dùng / Khóa tài khoản / Hạ quyền Admin
router.put('/users/:id', authMiddleware, adminOnly, authCtrl.updateUser);

// 4. Nâng cấp một người dùng thường lên Admin
router.post('/users/:id/promote', authMiddleware, adminOnly, authCtrl.promoteUser);

// 5. Lấy thông tin chi tiết một người dùng theo ID
router.get('/users/:id', authMiddleware, adminOnly, authCtrl.getUserById);

// 6. Hạ cấp một Admin xuống người dùng thường
router.post('/users/:id/demote', authMiddleware, adminOnly, authCtrl.demoteUser);

// 7.Yêu cầu gửi mail đặt lại mật khẩu
router.post('/forgot-password', authCtrl.forgotPassword);
// 8.Thực hiện đổi mật khẩu mới bằng Token từ mail
router.post('/reset-password', authCtrl.resetPassword); 
// 9. Cap nhap thong tin nguoi dung
router.put('/profile', authMiddleware, authCtrl.updateProfile);
// 10. lay thong tin dua vao tong tai khoan trong admin
router.get('/users', authMiddleware, adminOnly, authCtrl.getUsers);

module.exports = router;