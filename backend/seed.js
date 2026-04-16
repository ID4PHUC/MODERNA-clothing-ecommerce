require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category'); // Đã thêm model Category
const Admin = require('./models/Admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Clothing-Store';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@moderna.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpass';

async function main() {
  console.log('🚀 Đang kết nối tới:', MONGO_URI);
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');

    // 1. DỌN DẸP DỮ LIỆU CŨ (Để đảm bảo dữ liệu sạch, không bị lỗi "Quan jen" cũ)
    console.log('🧹 Đang dọn dẹp dữ liệu cũ...');
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('✨ Đã xóa các sản phẩm và danh mục cũ');

    // 2. TẠO TÀI KHOẢN ADMIN
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = new User({ 
        email: ADMIN_EMAIL, 
        name: 'Super Admin', 
        passwordHash: hash, 
        isAdmin: true 
      });
      await admin.save();
      console.log('👤 Đã tạo Admin mới:', ADMIN_EMAIL);
    } else {
      admin.isAdmin = true;
      await admin.save();
      console.log('👤 Tài khoản Admin đã tồn tại');
    }

    // Đảm bảo có record trong collection Admin
    await Admin.findOneAndUpdate(
      { user: admin._id },
      { user: admin._id, email: admin.email, name: admin.name },
      { upsert: true }
    );

    // 3. TẠO DANH MỤC (CATEGORY) MẪU
    // Việc tạo này giúp lấy được ID thực tế từ DB thay vì gán tĩnh
    const catAo = await Category.create({ name: 'Áo', slug: 'ao' });
    const catQuan = await Category.create({ name: 'Quần', slug: 'quan' });
    console.log('📂 Đã tạo danh mục: Áo, Quần');

    // 4. TẠO SẢN PHẨM MẪU
    const samples = [
      { 
        title: 'Áo Blazer Osl Casual Blazer', 
        price: 1080000, 
        image: 'https://pub-cdn.sider.ai/u/U0VEH8859ZG/web-coder/6931ab5dd9e33362d2778ef0/resource/3a51a469-2f87-4441-b29e-6464dcb5e583.jpg', 
        category: catAo._id, // Gắn ID tự động của category "Áo"
        gender: 'male', 
        rating: 4.8 
      },
      { 
        title: 'Áo Sơ Mi Flannel Caro', 
        price: 950000, 
        image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c', 
        category: catAo._id, 
        gender: 'male',
        rating: 4.7
      },
      { 
        title: 'Quần Jeans Osl Super Stretch', 
        price: 540000, 
        image: 'https://pub-cdn.sider.ai/u/U0VEH8859ZG/web-coder/6931ab5dd9e33362d2778ef0/resource/a7bbefd1-fd03-4b0c-ba45-acffe60c9336.jpg', 
        category: catQuan._id, // Gắn ID tự động của category "Quần"
        gender: 'male', 
        rating: 4.9 
      },
      { 
        title: 'Basic Tee - White', 
        price: 250000, 
        image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246', 
        category: catAo._id,
        gender: 'unisex', 
        rating: 4.6 
      }
    ];

    await Product.insertMany(samples);
    console.log('📦 Đã nạp', samples.length, 'sản phẩm mẫu thành công');

    console.log('🎉 TẤT CẢ HOÀN TẤT!');
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu:', error);
  } finally {
    mongoose.disconnect();
  }
}

main();