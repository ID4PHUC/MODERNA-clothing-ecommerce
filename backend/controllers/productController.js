const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2; // Import cloudinary để xóa ảnh

// --- HÀM HỖ TRỢ: LẤY PUBLIC_ID TỪ LINK CLOUDINARY ---
// Mục đích: Để xóa ảnh trên Cloudinary cần cái ID này
const getPublicId = (url) => {
  try {
    const parts = url.split('/');
    const folder = parts[parts.length - 2]; // Ví dụ: moderna_products
    const fileName = parts[parts.length - 1].split('.')[0]; // Ví dụ: abc123
    return `${folder}/${fileName}`;
  } catch (err) {
    return null;
  }
};

// 1. LẤY TẤT CẢ SẢN PHẨM
const getProducts = async (req, res) => {
  try {
    const { gender, category, q, priceMin, priceMax, page = 1, limit = 20, sort } = req.query;
    const filter = {};
    if (gender) filter.gender = gender;
    if (category) filter.$or = [{ category }, { subCategory: category }];
    
    if (priceMin !== undefined || priceMax !== undefined) {
      filter.price = {};
      if (priceMin !== undefined) filter.price.$gte = Number(priceMin);
      if (priceMax !== undefined) filter.price.$lte = Number(priceMax);
    }

    let query = q 
      ? Product.find({ $text: { $search: q }, ...filter }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } })
      : Product.find(filter);

    if (!q) {
      if (sort === 'price_asc') query.sort({ price: 1 });
      else if (sort === 'price_desc') query.sort({ price: -1 });
      else query.sort({ createdAt: -1 });
    }

    const p = Math.max(1, Number(page));
    const lim = Math.max(1, Math.min(100, Number(limit)));
    const products = await query.skip((p - 1) * lim).limit(lim).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. LẤY CHI TIẾT SẢN PHẨM
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. THÊM SẢN PHẨM
const addProduct = async (req, res) => {
  try {
    const { title, price, discount, countInStock, mainImageIndex } = req.body;

    // --- BẢO MẬT 1: KIỂM TRA DỮ LIỆU ĐẦU VÀO ---
    if (!title || title.trim().length < 5) return res.status(400).json({ error: 'Tiêu đề phải ít nhất 5 ký tự' });
    
    const cleanPrice = Number(price.toString().replace(/\D/g, ''));
    if (isNaN(cleanPrice) || cleanPrice <= 0) return res.status(400).json({ error: 'Giá sản phẩm phải là số dương' });

    // --- BẢO MẬT 2: CHỐNG SPAM UPLOAD ---
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Vui lòng upload ít nhất 1 ảnh' });
    if (req.files.length > 10) return res.status(400).json({ error: 'Tối đa chỉ được 10 ảnh' });

    const imagesPaths = req.files.map(file => file.path);
    const mIndex = Number(mainImageIndex) || 0;

    const product = new Product({
      ...req.body,
      title: title.trim(),
      price: cleanPrice,
      discount: Math.min(100, Math.max(0, Number(discount) || 0)), // 0-100%
      countInStock: Math.max(0, Number(countInStock) || 0),
      images: imagesPaths,
      image: imagesPaths[mIndex] || imagesPaths[0]
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. CẬP NHẬT SẢN PHẨM
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { existingImages, mainImageIndex, price } = req.body;
    
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });

    // --- XÓA ẢNH THỪA TRÊN CLOUDINARY ---
    // Nếu ảnh cũ không còn nằm trong danh sách giữ lại (existingImages), ta xóa nó trên Cloudinary
    let oldImages = product.images || [];
    let parsedExisting = [];
    if (existingImages) {
        parsedExisting = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
    }
    
    // Tìm những ảnh bị người dùng xóa bỏ ở Frontend
    const imagesToDestroy = oldImages.filter(img => !parsedExisting.includes(img));
    for (const imgUrl of imagesToDestroy) {
        const publicId = getPublicId(imgUrl);
        if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    // Gộp ảnh mới
    let finalImages = parsedExisting;
    if (req.files && req.files.length > 0) {
        const newPaths = req.files.map(file => file.path);
        finalImages = [...finalImages, ...newPaths];
    }

    const mIndex = Number(mainImageIndex) || 0;
    product.images = finalImages;
    product.image = finalImages[mIndex] || finalImages[0];

    // Cập nhật các trường khác
    Object.assign(product, req.body);
    if (price) product.price = Number(price.toString().replace(/\D/g, ''));

    await product.save();
    res.json({ success: true, message: 'Cập nhật thành công', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. XÓA SẢN PHẨM (XÓA SẠCH ẢNH TRÊN CLOUDINARY)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    // --- BẢO MẬT: Xóa toàn bộ ảnh trên Cloudinary trước khi xóa DB ---
    for (const imgUrl of product.images) {
      const publicId = getPublicId(imgUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa sản phẩm và sạch ảnh trên Cloudinary' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProducts, getProductById, addProduct, updateProduct, deleteProduct };