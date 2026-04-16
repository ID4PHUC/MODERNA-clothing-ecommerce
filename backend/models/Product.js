const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // Phần trăm giảm giá (VD: 10 cho 10%)
  
  // 1. Thay vì 1 String, dùng Array để lưu NHIỀU HÌNH ẢNH
  images: [{ type: String }], 
  
  // Giữ lại 1 ảnh làm ảnh đại diện (thumbnail)
  image: { type: String }, 

  // 2. Thêm trường MÔ TẢ chi tiết
  description: { type: String, default: '' },

  gender: { type: String, enum: ['male', 'female', 'unisex'], default: 'unisex' },
  
  // 3. Category và SubCategory (Có thể giữ String hoặc dùng ObjectId nếu bạn có Model Category riêng)
  category: { type: String, required: true },
  subCategory: { type: String, required: true },

  // 4. Nên thêm SỐ LƯỢNG TỒN KHO để quản lý đơn hàng tốt hơn
  countInStock: { type: Number, default: 0 },

  // 5. Sản phẩm nổi bật (để hiển thị ở trang chủ)
  isFeatured: { type: Boolean, default: false },

  // 6. QUẢN LÝ BIẾN THỂ
  sizes: [{ type: String }], // Lưu mảng: ["S", "M", "L", "XL"]
  colors: [{ type: String }], // Lưu mảng: ["Đen", "Trắng", "Xanh"]

  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 } // Số lượng đánh giá
}, { timestamps: true });
// Text index for search on title and description
ProductSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);