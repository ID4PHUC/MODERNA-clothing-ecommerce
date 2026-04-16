const Review = require('../models/Review');

// Lấy toàn bộ danh sách đánh giá
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('product', 'title image') // Hiện tên SP
      .populate('user') // Lấy hết thông tin user cho chắc
      .sort({ createdAt: -1 });     
    //console.log("Danh sách đánh giá lấy được:", reviews); // Thêm dòng này để xem ở Terminal dung de test lay api de tao kiem tra khong dc xoa  nha  
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xóa một đánh giá
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await Review.findByIdAndDelete(id);
    res.json({ success: true, message: "Đã xóa đánh giá thành công" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// kiem tra sua  loi  //
exports.createReview = async (req, res) => {
  console.log("------------------------------------------");
  console.log("=> CÓ YÊU CẦU GỬI ĐÁNH GIÁ MỚI!");
  
  try {
    const { product, rating, comment } = req.body;
    
    // 1. Kiểm tra dữ liệu đầu vào
    console.log("=> Dữ liệu Body:", req.body);
    
    // 2. Kiểm tra User từ Token
    if (!req.user) {
        console.error("=> LỖI: Không tìm thấy thông tin User trong Token (authMiddleware có vấn đề)");
        return res.status(401).json({ error: "Bạn cần đăng nhập lại" });
    }
    console.log("=> User ID thực tế:", req.user.id || req.user._id);

    const newReview = new Review({
      product: product,
      user: req.user.id || req.user._id, 
      rating: Number(rating),
      comment: comment || "" 
    });

    // 3. Thử lưu
    const saved = await newReview.save();
    console.log("=> ĐÃ LƯU THÀNH CÔNG ID:", saved._id);
    
    res.status(201).json({ success: true });

  } catch (err) {
    console.error("=> LỖI KHI LƯU VÀO DATABASE:", err.message);
    res.status(500).json({ error: err.message });
  }
};