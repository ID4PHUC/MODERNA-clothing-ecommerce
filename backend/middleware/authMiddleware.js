const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';

// ================= VERIFY TOKEN =================
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại' });
    }

    // LƯU Ý: Gán user vào request
    req.user = user;
    
    // DEBUG: Xem thông tin user lấy từ Database lên Terminal của VS Code
    console.log("--- AUTH DEBUG ---");
    console.log("User found in DB:", {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role // In thêm role nếu bạn có dùng trường này
    });

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

// ================= ADMIN ONLY =================
const adminOnly = (req, res, next) => {
  console.log("--- ADMIN CHECK ---");
  console.log("Checking admin status for:", req.user?.email);
  console.log("Value of isAdmin:", req.user?.isAdmin);

  // Kiểm tra quyền Admin
  if (req.user && (req.user.isAdmin === true || req.user.role === 'admin')) {
    console.log("Access Granted: User is Admin");
    return next();
  }

  console.log("Access Denied: Not an Admin");
  return res.status(403).json({ 
    error: 'Admin only', 
    debugInfo: "Tài khoản của bạn không có quyền Admin trong database" 
  });
};

module.exports = { authMiddleware, adminOnly };