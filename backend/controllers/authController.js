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
      console.warn('⚠️ [Seed] Thiếu thông tin Admin trong .env, bỏ qua khởi tạo.');
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
    // Lấy thêm các trường bảo mật từ req.body
    const { email, password, name, captchaAnswer, captchaCheck, address_confirm } = req.body;

    // --- LỚP BẢO VỆ 1: HONEYPOT (BẪY BOT) ---
    // Nếu trường 'address_confirm' có dữ liệu -> Chắc chắn là Bot điền ẩn
    if (address_confirm && address_confirm.length > 0) {
      console.warn(`[SECURITY ALERT] Phát hiện Bot đăng ký tại email: ${email}`);
      return res.status(400).json({ error: 'Hành động bị từ chối do nghi ngờ robot!' });
    }

    // --- LỚP BẢO VỆ 2: KIỂM TRA PHÉP TÍNH ---
    // Kiểm tra xem người dùng có nhập đúng kết quả phép tính không
    if (!captchaAnswer || parseInt(captchaAnswer) !== parseInt(captchaCheck)) {
      return res.status(400).json({ error: 'Xác nhận phép tính không chính xác. Vui lòng thử lại.' });
    }

    // --- LOGIC ĐĂNG KÝ GỐC CỦA BẠN ---
    if (!email || !password) {
      return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      name: name || '',
      passwordHash,
      isAdmin: false,
      isActive: true 
    });

    await user.save();
    
    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { id: user._id, email: user.email, name: user.name,phone: user.phone,address: user.address, isAdmin: user.isAdmin } 
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
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng với email này.' });

    // Tạo mã token ngẫu nhiên và thời gian hết hạn (1 giờ)
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();

    // Cấu hình Nodemailer gửi bằng Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Email của bạn trong .env
        pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng trong .env
      }
    });

    // Link dẫn tới trang reset trên giao diện của bạn
    const resetUrl = `http://localhost:3000/reset-password.html?token=${token}`;

    const mailOptions = {
      to: user.email,
      subject: '[MODERNA] Yêu cầu đặt lại mật khẩu',
      html: `<h3>Chào ${user.name || 'bạn'},</h3>
             <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản Moderna.</p>
             <p>Vui lòng nhấn vào link bên dưới để đặt mật khẩu mới (có hiệu lực trong 1 giờ):</p>
             <a href="${resetUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
             <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email đặt lại mật khẩu đã được gửi thành công!' });

  } catch (err) {
    res.status(500).json({ error: 'Lỗi gửi mail: ' + err.message });
  }
};

// --- HÀM 2: ĐẶT LẠI MẬT KHẨU MỚI ---
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Tìm user có token khớp và chưa hết hạn
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });

    // Hash mật khẩu mới và xóa token
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    res.json({ message: 'Mật khẩu đã được cập nhật thành công!' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// ================= 4. LOGIN (Có kiểm tra Trạng thái Khóa) =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ error: 'Thông tin đăng nhập không chính xác' });

    // KIỂM TRA TÀI KHOẢN CÓ ĐANG BỊ KHÓA KHÔNG
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin gốc.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Thông tin đăng nhập không chính xác' });

    const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, email: user.email, name: user.name,phone: user.phone, address: user.address, isAdmin: user.isAdmin, role: user.isAdmin ? 'admin' : 'user' } });
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
