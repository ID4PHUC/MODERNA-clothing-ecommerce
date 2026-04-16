const mongoose = require('mongoose');

// Định nghĩa cấu trúc từng sản phẩm trong đơn hàng
const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  size: { type: String },
  color: { type: String }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [OrderItemSchema],
  total: { type: Number, required: true },
  
  // 1. Trạng thái tổng quát của đơn hàng
status: { 
  type: String, 
  // Cập nhật enum để khớp hoàn toàn với các thẻ <option> trong HTML của bạn
  enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'processing'], 
  default: 'pending' 
},

  // 2. Phương thức thanh toán (Mới thêm)
  paymentMethod: { 
    type: String, 
    enum: ['cod', 'momo', 'vnpay'], 
    default: 'cod' 
  },

  // 3. Trạng thái thanh toán cụ thể (Mới thêm/Cập nhật)
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },

  // 4. Mã vận đơn/Mã đơn hàng (Dùng để đối soát với MoMo)
  trackingCode: { type: String, unique: true, index: true },

  // 5. Cấu trúc địa chỉ chi tiết (Thay vì chỉ Object chung chung)
  address: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    detail: { type: String, required: true } // Địa chỉ cụ thể: Số nhà, tên đường...
  }

}, { 
  timestamps: true // Tự động tạo createdAt và updatedAt
});

module.exports = mongoose.model('Order', OrderSchema);