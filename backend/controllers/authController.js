const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); 

// Lấy Secret từ env, ưu tiên bảo mật
const JWT_SECRET = process.env.JWT_SECRET;

// ================= 1. AUTO SEED ADMIN (TỪ .ENV) =================
exports.autoSeedUsers = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Super Admin';

    if (!email || !password) {
      console.warn(' [Seed] Thiếu thông tin Admin trong .env, bỏ qua khởi tạo.');
      return;
    }

    let user = await User.findOne({ email });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      user = new User({
        email,
        name,
        passwordHash,
        isAdmin: true,
        isActive: true // Luôn kích hoạt cho Admin gốc
      });

      await user.save();
      console.log(`✅ [Seed] Đã tạo User Admin: ${email}`);
    } else if (!user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }

    // Đồng bộ sang bảng Admin
    await Admin.findOneAndUpdate(
      { user: user._id },
      { user: user._id, email: user.email, name: user.name, role: 'admin' },
      { upsert: true, new: true }
    );
    
    console.log(`⭐ [Seed] Hồ sơ Admin đã được đồng bộ.`);
  } catch (err) {
    console.error('❌ [Seed] Lỗi hệ thống:', err.message);
  }
};

// ================= 2. REGISTER =================
exports.register = async (req, res) => {
  try {
    const { email, password, name, captchaAnswer, captchaCheck, address_confirm } = req.body;

    if (address_confirm) return res.status(400).json({ error: 'Robot detected!' });

    if (!captchaAnswer || parseInt(captchaAnswer) !== parseInt(captchaCheck)) {
      return res.status(400).json({ error: 'Captcha sai.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ error: 'Email đã tồn tại.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email: email.toLowerCase().trim(),
      name: name || '',
      passwordHash,
      isAdmin: false,
      isActive: true 
    });

    await user.save();
    
    // Tối ưu JWT Payload (Thêm role)
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin, role: 'user' }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 3.Logic xử lý quen mk=================
// --- HÀM 1: GỬI MAIL QUÊN MẬT KHẨU ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(404).json({ error: 'Email không tồn tại.' });

    //HASH TOKEN RESET TRƯỚC KHI LƯU VÀO DB
    const rawToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
    await user.save();

    // LINK RESET DÙNG BIẾN MÔI TRƯỜNG 
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password.html?token=${rawToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
      to: user.email,
      subject: '[MODERNA] Reset Password',
      html: `<h3>Yêu cầu đặt lại mật khẩu</h3>
             <p>Vui lòng nhấn vào link: <a href="${resetUrl}">${resetUrl}</a></p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email đã gửi!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- HÀM 2: ĐẶT LẠI MẬT KHẨU MỚI ---
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    //Hash cái token người dùng gửi lên để so sánh với DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Token không hợp lệ hoặc hết hạn.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Mật khẩu đã đổi thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ================= 4. LOGIN (Có kiểm tra Trạng thái Khóa) =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Tài khoản không hợp lệ hoặc bị khóa.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Sai mật khẩu.' });

    // Tối ưu JWT Payload
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        isAdmin: user.isAdmin,
        role: user.isAdmin ? 'admin' : 'user' 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 5. ADMIN:Lấy danh sách: Gắn thêm cờ isRoot để Frontend nhận biết =================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').lean();
    const rootEmail = process.env.ADMIN_EMAIL;

    const finalUsers = users.map(u => ({
      ...u,
      isRoot: u.email === rootEmail // Kiểm tra nếu là Root Admin
    }));

    res.json(finalUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 6. ADMIN: XÓA USER (Bảo vệ Root Admin) =================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    // CHẶN XÓA ROOT ADMIN
    if (targetUser.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Đây là tài khoản Root Admin gốc. Không thể xóa!' });
    }

    await User.findByIdAndDelete(id);
    await Admin.findOneAndDelete({ user: id });
    res.json({ message: 'Đã xóa người dùng thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 7. ADMIN: CẬP NHẬT BAO VE =================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body; // Frontend gửi name và isActive (true/false)

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    // BẢO VỆ ROOT ADMIN
    if (targetUser.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Hành động bị từ chối: Không thể sửa hoặc khóa Root Admin!' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { name, isActive } },
      { new: true }
    ).select('-passwordHash');

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ================= 8. ADMIN: NÂNG CẤP LÊN ADMIN (PROMOTE) =================
exports.promoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isAdmin: true }, { new: true });
    
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    // Cập nhật sang bảng Admin
    await Admin.findOneAndUpdate(
      { user: user._id },
      { user: user._id, email: user.email, name: user.name, role: 'admin' },
      { upsert: true }
    );

    res.json({ message: `Đã nâng cấp ${user.email} lên làm Admin` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; // Kết thúc hàm promoteUser tại đây

// ================= 9. ADMIN: HẠ CẤP XUỐNG USER THƯỜNG =================
exports.demoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id);

    if (targetUser.email === process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Không thể hạ cấp Root Admin!' });
    }

    await User.findByIdAndUpdate(id, { isAdmin: false });
    res.json({ message: 'Đã hạ cấp thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 10. ADMIN: LẤY 1 USER THEO ID =================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= 11. USER: TỰ CẬP NHẬT HỒ SƠ =================
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.id; // Lấy từ authMiddleware

    if (!phone || !address) {
      return res.status(400).json({ error: 'Số điện thoại và địa chỉ là bắt buộc' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, phone, address } },
      { new: true }
    ).select('-passwordHash');

    res.json({ message: 'Cập nhật thành công', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  tra  ve
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Lấy hết user trừ mật khẩu
    res.json(users); // Trả về mảng [{}, {}, ...]
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
