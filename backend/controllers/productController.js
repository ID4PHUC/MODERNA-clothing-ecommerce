const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// 1. Lấy tất cả sản phẩm (Có lọc theo category/gender)
const getProducts = async (req, res) => {
  try {
    const { gender, category, q, priceMin, priceMax, page = 1, limit = 20, sort } = req.query;
    const filter = {};

    if (gender) {
      filter.gender = gender;
    }

    // 🔥 QUAN TRỌNG: CATEGORY CHA + CON
    if (category) {
      filter.$or = [
        { category },
        { subCategory: category }
      ];
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      filter.price = {};
      if (priceMin !== undefined) filter.price.$gte = Number(priceMin);
      if (priceMax !== undefined) filter.price.$lte = Number(priceMax);
    }

    let query;

    // Full-text search
    if (q) {
      query = Product.find(
        { $text: { $search: q }, ...filter },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } });
    } else {
      query = Product.find(filter);
      if (sort === 'price_asc') query.sort({ price: 1 });
      else if (sort === 'price_desc') query.sort({ price: -1 });
      else query.sort({ createdAt: -1 });
    }

    const p = Math.max(1, Number(page));
    const lim = Math.max(1, Math.min(100, Number(limit)));

    const products = await query
      .skip((p - 1) * lim)
      .limit(lim)
      .lean();

    res.json(products);
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ error: err.message });
  }
};


// 2. Lấy chi tiết 1 sản phẩm theo ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Thêm sản phẩm mới (Xử lý upload ảnh)
const addProduct = async (req, res) => {
  try {
    // THÊM: sizes và colors vào đây
    const { title, price, discount, gender, category, subCategory, description, countInStock, sizes, colors } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Tiêu đề và Giá là bắt buộc' });
    }

    const imagesPaths = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];

    // CHUẨN HÓA: Vì form-data gửi lên 1 giá trị sẽ là string, nhiều giá trị là array
    const sizesArray = sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [];
    const colorsArray = colors ? (Array.isArray(colors) ? colors : [colors]) : [];

    const product = new Product({
      title,
      price: Number(price),
      discount: Number(discount) || 0,
      description: description || '',
      gender: gender || 'unisex',
      category,
      subCategory,
      countInStock: Number(countInStock) || 0,
      images: imagesPaths,
      image: imagesPaths.length > 0 ? imagesPaths[0] : '',
      // LƯU BIẾN THỂ VÀO DB
      sizes: sizesArray,
      colors: colorsArray
    });

    await product.save();
    res.status(201).json({ message: 'Thêm sản phẩm thành công', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Cập nhật sản phẩm theo ID

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, price, discount, gender, category, subCategory, description, countInStock, sizes, colors, existingImages } = req.body;
    
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm để cập nhật' });

    // --- LOGIC XỬ LÝ HÌNH ẢNH MỚI ---
    let finalImages = [];

    // Bước A: Lấy danh sách ảnh cũ mà người dùng KHÔNG xóa (gửi từ Frontend)
    if (existingImages) {
        // Nếu chỉ có 1 ảnh thì nó là string, nhiều ảnh là array -> Chuẩn hóa về array
        finalImages = Array.isArray(existingImages) ? existingImages : [existingImages];
    }

    // Bước B: Nếu người dùng có chọn thêm file ảnh mới từ máy tính
    if (req.files && req.files.length > 0) {
        const newImagesPaths = req.files.map(file => '/uploads/' + file.filename);
        finalImages = [...finalImages, ...newImagesPaths]; // Gộp ảnh cũ còn lại + ảnh mới thêm
    }

    // Bước C: Cập nhật vào Database
    // Nếu có ảnh (dù là cũ còn lại hay mới thêm) thì cập nhật mảng images
    if (finalImages.length > 0) {
        product.images = finalImages;
        product.image = finalImages[0]; // Lấy tấm đầu tiên làm ảnh đại diện
    } else {
        // Nếu xóa sạch sành sanh không còn tấm nào (tùy bạn có cho phép không)
        product.images = [];
        product.image = '';
    }

    // --- CẬP NHẬT CÁC THÔNG TIN KHÁC ---
    if (title) product.title = title;
    if (price) product.price = Number(price);
    if (discount !== undefined) product.discount = Number(discount);
    if (gender) product.gender = gender;
    if (category) product.category = category;
    if (subCategory) product.subCategory = subCategory;
    if (description !== undefined) product.description = description;
    if (countInStock !== undefined) product.countInStock = Number(countInStock);

    // Cập nhật Size/Màu (Chuẩn hóa mảng)
    // Xử lý Size (Nếu không gửi gì lên thì coi như mảng rỗng)
    product.sizes = sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [];
    // Xử lý Màu (Tương tự)
    product.colors = colors ? (Array.isArray(colors) ? colors : [colors]) : [];

    await product.save();
    res.json({ message: 'Cập nhật sản phẩm thành công', product });
  } catch (err) {
    console.error('Lỗi updateProduct:', err);
    res.status(500).json({ error: err.message });
  }
};

// 5. Xóa sản phẩm và xóa luôn ảnh trong thư mục uploads
const deleteProduct = async (req, res) => {
  try {
    // 1. Tìm sản phẩm để lấy danh sách đường dẫn ảnh trước khi xóa khỏi DB
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm để xóa' });
    }

    // 2. Lấy danh sách ảnh (mảng images)
    const imagesToDelete = product.images || [];

    // 3. Xóa sản phẩm khỏi database
    await Product.findByIdAndDelete(req.params.id);

    // 4. Vòng lặp xóa các file ảnh vật lý
    imagesToDelete.forEach(imagePath => {
      // imagePath thường có dạng: "/uploads/ten-anh.jpg"
      // Chúng ta cần chuyển nó thành đường dẫn tuyệt đối trên ổ đĩa
      // __dirname là thư mục 'controllers', '..' để ra ngoài thư mục 'backend'
      const fullPath = path.join(__dirname, '..', imagePath);

      // Kiểm tra file có tồn tại không rồi mới xóa
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
          if (err) {
            console.error(`Lỗi khi xóa file ${fullPath}:`, err);
          } else {
            console.log(`Đã xóa file thành công: ${fullPath}`);
          }
        });
      }
    });

    res.json({ success: true, message: 'Đã xóa sản phẩm và các ảnh liên quan thành công' });
  } catch (err) {
    console.error('Lỗi deleteProduct:', err);
    res.status(500).json({ error: err.message });
  }
};

// Xuất các hàm theo dạng object để sử dụng trong Routes
module.exports = { 
  getProducts, 
  getProductById, 
  addProduct, 
  updateProduct, 
  deleteProduct 
};