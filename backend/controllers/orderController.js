const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');


//1. Tạo đơn hàng
exports.createOrder = async (req, res) => {
  try {
    const { items, address } = req.body;
    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product);
      if (!product) continue;

      // Tính giá giảm chuẩn
      const finalPrice = Math.round(product.price * (1 - (product.discount || 0) / 100));

      processedItems.push({
        product: product._id,
        quantity: Number(item.quantity) || 1,
        price: finalPrice,
        size: item.size,
        color: item.color
      });
      calculatedTotal += finalPrice * (Number(item.quantity) || 1);
    }

    const order = new Order({
      user: req.user.id,
      items: processedItems,
      total: calculatedTotal,
      address,
      trackingCode: `ORD${Date.now()}`
    });

    await order.save();
    res.status(201).json({ success: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Lấy chi tiết 1 đơn hàng (Dùng cho trang Chi tiết đơn hàng)
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName email phoneNumber') // Lấy thêm thông tin khách
      .populate('items.product')                      // Lấy chi tiết sản phẩm
      .lean();

    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    // Kiểm tra quyền: Chỉ chủ đơn hàng hoặc Admin mới được xem
    if (order.user._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Truy cập bị từ chối' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Lấy danh sách đơn hàng của người dùng đang đăng nhập (Lịch sử mua hàng)
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product') // QUAN TRỌNG: Phải có dòng này để hiện tên/ảnh SP ở trang lịch sử
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. ADMIN: Lấy tất cả đơn hàng (Trang Quản lý đơn hàng)
exports.getAllOrders = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Chỉ dành cho Admin' });

    const orders = await Order.find()
      .populate('user', 'fullName email') // Đổ dữ liệu user để hiện tên thật thay vì chữ "Khách hàng"
      .populate('items.product')          // Đổ dữ liệu sản phẩm để hiện tên/ảnh trong mảng items
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. ADMIN: Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
  try {
    // Thêm dòng log này để kiểm tra
    console.log("Admin đang cập nhật đơn hàng:", req.params.id, "Trạng thái mới:", req.body.status);

    const { status, paymentStatus } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, paymentStatus },
      { new: true, runValidators: true } // Thêm runValidators: true để thấy lỗi nếu enum sai
    );

    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    res.json({ message: 'Cập nhật trạng thái thành công', order });
  } catch (err) {
    console.error("LỖI CẬP NHẬT ĐƠN HÀNG:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// cho phép người dùng tự hủy đơn hàng của chính mình 
exports.cancelUserOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    // Kiểm tra quyền: Phải là chủ đơn hàng
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn hàng này' });
    }

    // Chỉ cho phép hủy khi đơn hàng đang ở trạng thái 'pending'
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng đã được xử lý, không thể tự hủy.' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Đã hủy đơn hàng thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};