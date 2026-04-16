const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const qs = require('qs');

// 1. Lấy giỏ hàng của người dùng
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product').lean();
    res.json({ cart: cart || { items: [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size = 'Mặc định', color = 'Mặc định' } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [{ product: productId, quantity, size, color }] });
    } else {
      const idx = cart.items.findIndex(i => 
        i.product.toString() === productId && i.size === size && i.color === color
      );
      if (idx >= 0) cart.items[idx].quantity += quantity;
      else cart.items.push({ product: productId, quantity, size, color });
    }

    await cart.save();
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    res.json({ cart: updatedCart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Cập nhật số lượng
exports.updateCart = async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ error: 'Giỏ hàng trống' });

    const idx = cart.items.findIndex(i => 
        i.product.toString() === productId && i.size === size && i.color === color
    );

    if (idx !== -1) {
      if (quantity > 0) cart.items[idx].quantity = quantity;
      else cart.items.splice(idx, 1);
      await cart.save();
    }
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    res.json({ cart: updatedCart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

  // 4. Xóa sản phẩm
  exports.removeFromCart = async (req, res) => {
    try {
      const { productId, size, color } = req.body;
      let cart = await Cart.findOne({ user: req.user.id });
      if (cart) {
        cart.items = cart.items.filter(i => 
          !(i.product.toString() === productId && i.size === size && i.color === color)
        );
        await cart.save();
      }
      const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
      res.json({ cart: updatedCart });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

// 5. THANH TOÁN CHÍNH
exports.checkout = async (req, res) => {
    try {
        const { address, paymentMethod, items: buyNowItems } = req.body;

        if (!address || !paymentMethod) {
            return res.status(400).json({ error: "Thiếu thông tin giao hàng hoặc phương thức thanh toán" });
        }

        let orderItems = [];
        let total = 0;

        // --- BƯỚC 1: XỬ LÝ DỮ LIỆU SẢN PHẨM ---
        const inputItems = (buyNowItems && buyNowItems.length > 0) ? buyNowItems : null;
        if (inputItems) {
            for (const item of inputItems) {
                const product = await Product.findById(item.productId || item.product);
                if (!product) continue;
                const finalPrice = Math.round(product.price * (1 - (product.discount || 0) / 100));
                orderItems.push({
                    product: product._id,
                    quantity: Number(item.quantity) || 1,
                    price: finalPrice,
                    size: item.size || 'Mặc định',
                    color: item.color || 'Mặc định'
                });
                total += finalPrice * (Number(item.quantity) || 1);
            }
        } else {
            const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
            if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Giỏ hàng trống' });
            for (const it of cart.items) {
                if (!it.product) continue;
                const finalPrice = Math.round(it.product.price * (1 - (it.product.discount || 0) / 100));
                orderItems.push({
                    product: it.product._id,
                    quantity: it.quantity,
                    price: finalPrice,
                    size: it.size,
                    color: it.color
                });
                total += finalPrice * it.quantity;
            }
        }

        if (orderItems.length === 0) return res.status(400).json({ error: 'Không có sản phẩm hợp lệ' });

        // --- BƯỚC 2: PHÂN LOẠI PHƯƠNG THỨC THANH TOÁN ---

        // A. THANH TOÁN COD
        if (paymentMethod === 'cod') {
            const trackingCode = `ORD${Date.now()}`;
            const newOrder = new Order({
                user: req.user.id, items: orderItems, total, address,
                paymentMethod: 'cod', trackingCode
            });
            await newOrder.save();
            await Cart.findOneAndDelete({ user: req.user.id });
            return res.json({ success: true, trackingCode, message: 'Đặt hàng thành công!' });
        }

        // B. THANH TOÁN MOMO
        else if (paymentMethod === 'momo') {
            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;
            const apiUrl = process.env.MOMO_API_URL;

            const orderId = "MODERNA" + Date.now() + Math.floor(Math.random() * 1000);
            const requestId = orderId;
            const orderInfo = "Thanh toán đơn hàng " + orderId;
            const redirectUrl = process.env.MOMO_REDIRECT_URL;
            const ipnUrl = process.env.MOMO_IPN_URL;
            const amount = Math.round(total).toString();
            const requestType = "payWithMethod";

            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            const body = {
                partnerCode, requestId, amount: Number(amount), orderId, orderInfo,
                redirectUrl, ipnUrl, extraData: "", requestType, signature, lang: 'vi'
            };

            const response = await axios.post(apiUrl, body);
            if (response.data && response.data.resultCode === 0) {
                const newOrder = new Order({
                    user: req.user.id, items: orderItems, total, address,
                    paymentMethod: 'momo', trackingCode: orderId, paymentStatus: 'pending'
                });
                await newOrder.save();
                return res.json({ success: true, payUrl: response.data.payUrl });
            } else {
                return res.status(400).json({ error: response.data.message });
            }
        }

        // C. THANH TOÁN VNPAY
        else if (paymentMethod === 'vnpay') {
            const tmnCode = process.env.VNP_TMN_CODE;
            const secretKey = process.env.VNP_HASH_SECRET;
            let vnpUrl = process.env.VNP_URL;
            const returnUrl = process.env.VNP_RETURN_URL;

            const date = new Date();
            const createDate = moment(date).format('YYYYMMDDHHmmss');
            const orderId = "VNP" + moment(date).format('HHmmss') + Math.floor(Math.random() * 100);
            const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            let vnp_Params = {};
            vnp_Params['vnp_Version'] = '2.1.0';
            vnp_Params['vnp_Command'] = 'pay';
            vnp_Params['vnp_TmnCode'] = tmnCode;
            vnp_Params['vnp_Locale'] = 'vn';
            vnp_Params['vnp_CurrCode'] = 'VND';
            vnp_Params['vnp_TxnRef'] = orderId;
            vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
            vnp_Params['vnp_OrderType'] = 'other';
            vnp_Params['vnp_Amount'] = total * 100;
            vnp_Params['vnp_ReturnUrl'] = returnUrl;
            vnp_Params['vnp_IpAddr'] = ipAddr;
            vnp_Params['vnp_CreateDate'] = createDate;

            vnp_Params = sortObject(vnp_Params);

            const signData = qs.stringify(vnp_Params, { encode: false });
            const hmac = crypto.createHmac("sha512", secretKey);
            const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
            vnp_Params['vnp_SecureHash'] = signed;

            const finalUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });

            const newOrder = new Order({
                user: req.user.id, items: orderItems, total, address,
                paymentMethod: 'vnpay', trackingCode: orderId, paymentStatus: 'pending'
            });
            await newOrder.save();

            return res.json({ success: true, payUrl: finalUrl });
        }

    } catch (err) {
        console.error("==> [LỖI HỆ THỐNG]:", err);
        res.status(500).json({ error: "Có lỗi xảy ra trong quá trình xử lý đơn hàng" });
    }
};

// 6. Xử lý IPN MoMo
exports.momoIPN = async (req, res) => {
    const { orderId, resultCode } = req.body;
    try {
        if (resultCode == 0) {
            const order = await Order.findOne({ trackingCode: orderId });
            if (order) {
                order.paymentStatus = 'paid';
                order.status = 'processing';
                await order.save();
                await Cart.findOneAndDelete({ user: order.user });
            }
        }
        res.status(204).send();
    } catch (err) { res.status(500).send(); }
};

// Hàm hỗ trợ VNPay 
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// 7.API xóa giỏ hàng
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.id });
    res.json({ success: true, message: "Giỏ hàng đã được dọn dẹp" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};