const Product = require('../models/Product');
//const fs = require('fs');
//const path = require('path');

// 1. Lấy tất cả sản phẩm (Có lọc theo category/gender)
const getProducts = async (req, res) => {
  try {
    const { gender, category, q, priceMin, priceMax, page = 1, limit = 20, sort } = req.query;
    const filter = {};

    if (gender) {
      filter.gender = gender;
    }

    // CATEGORY CHA + CON
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
    console.log('--- NHẬN YÊU CẦU THÊM SẢN PHẨM ---');
    const { title, price, discount, gender, category, subCategory, description, countInStock, sizes, colors, mainImageIndex } = req.body;

    // 1. Kiểm tra dữ liệu bắt buộc
    if (!title || !price) {
      return res.status(400).json({ error: 'Tiêu đề và Giá là bắt buộc' });
    }

    // 2. Kiểm tra ảnh từ Cloudinary
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một tấm ảnh!' });
    }

    const imagesPaths = req.files.map(file => file.path);
    const mIndex = Number(mainImageIndex) || 0;

    // 3. Làm sạch giá tiền (Đề phòng lỗi .replace if price is not string)
    const cleanPrice = typeof price === 'string' ? price.replace(/\D/g, '') : price;

    const product = new Product({
      title,
      price: Number(cleanPrice),
      discount: Number(discount) || 0,
      description: description || '',
      gender: gender || 'unisex',
      category,
      subCategory,
      countInStock: Number(countInStock) || 0,
      images: imagesPaths,
      image: imagesPaths[mIndex] || imagesPaths[0],
      sizes: sizes ? (Array.isArray(sizes) ? sizes : [sizes]) : [],
      colors: colors ? (Array.isArray(colors) ? colors : [colors]) : []
    });

    await product.save();
    console.log('✅ Đã lưu sản phẩm vào MongoDB thành công!');
    res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công', product });

  } catch (err) {
    // HIỆN LỖI CHI TIẾT RA TERMINAL VS CODE (BẢNG ĐEN)
    console.error('🔥 LỖI BACKEND THẬT SỰ ĐÂY PHÚC ƠI:');
    console.error(err); 
    // Trả về lỗi dạng chữ để trình duyệt không bị [object Object]
    res.status(500).json({ error: err.message || 'Lỗi Server chưa xác định' });
  }
};
/*
const addProduct = async (req, res) => {
  try {
    // THÊM: sizes và colors vào đây
    const { title, price, discount, gender, category, subCategory, description, countInStock, sizes, colors } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Tiêu đề và Giá là bắt buộc' });
    }

    //const imagesPaths = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
    const imagesPaths = req.files ? req.files.map(file => file.path) : [];
    
    // 3. Xác định ảnh đại diện (Dựa trên cái ngôi sao ông chọn ở Frontend)
    const mIndex = Number(mainImageIndex) || 0;
    const mainImage = imagesPaths.length > 0 ? (imagesPaths[mIndex] || imagesPaths[0]) : '';

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
      image: mainImage,
      //image: imagesPaths.length > 0 ? imagesPaths[0] : '',//
      // LƯU BIẾN THỂ VÀO DB
      sizes: sizesArray,
      colors: colorsArray
    });

    await product.save();
    res.status(201).json({ message: 'Thêm sản phẩm thành công', product });
  } catch (err) {
    // HIỆN LỖI CHI TIẾT RA TERMINAL VS CODE
    console.error('--- LỖI BACKEND THẬT SỰ ---');
    console.error(err); 
    // GỬI LỖI VỀ TRÌNH DUYỆT DẠNG CHỮ
    res.status(500).json({ error: 'Lỗi Server: ' + err.message });
  }
}; 
*/
// 4. Cập nhật sản phẩm theo ID
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // Lấy mainImageIndex trực tiếp từ req.body
    const { existingImages, mainImageIndex } = req.body;
    
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    // --- 1. XỬ LÝ MẢNG ẢNH ---
    let finalImages = [];

    // Giải mã ảnh cũ
    if (existingImages) {
        try {
            const parsed = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
            finalImages = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            finalImages = Array.isArray(existingImages) ? existingImages : [existingImages];
        }
    }

    // Thêm ảnh mới từ Cloudinary
    if (req.files && req.files.length > 0) {
        const newPaths = req.files.map(file => file.path);
        finalImages = [...finalImages, ...newPaths];
    }

    // --- 2. XỬ LÝ CHỌN ẢNH CHÍNH ---
    // Ép kiểu mainImageIndex về số nguyên. 
    // Nếu nó là mảng (do lỗi gửi dư), ta lấy phần tử cuối cùng
    let mIndex = Array.isArray(mainImageIndex) ? mainImageIndex[mainImageIndex.length - 1] : mainImageIndex;
    mIndex = parseInt(mIndex);

    // Nếu mIndex không phải là số hoặc âm, mặc định là 0
    if (isNaN(mIndex) || mIndex < 0 || mIndex >= finalImages.length) {
        mIndex = 0;
    }

    product.images = finalImages;
    product.image = finalImages[mIndex];

    console.log(`--- DEBUG UPDATE ---`);
    console.log(`Số lượng ảnh: ${finalImages.length} | Index chọn: ${mIndex}`);
    console.log(`Ảnh chính: ${product.image}`);

    // --- 3. CẬP NHẬT CÁC TRƯỜNG KHÁC ---
    const fields = ['title', 'price', 'discount', 'gender', 'category', 'subCategory', 'description', 'countInStock'];
    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            if (field === 'price') {
                product[field] = Number(req.body[field].toString().replace(/\D/g, ''));
            } else {
                product[field] = req.body[field];
            }
        }
    });

    product.sizes = req.body.sizes ? (Array.isArray(req.body.sizes) ? req.body.sizes : [req.body.sizes]) : [];
    product.colors = req.body.colors ? (Array.isArray(req.body.colors) ? req.body.colors : [req.body.colors]) : [];

    await product.save();
    res.json({ success: true, message: 'Cập nhật thành công', product });

  } catch (err) {
    console.error('LỖI CẬP NHẬT:', err);
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
    //const imagesToDelete = product.images || [];

    // 3. Xóa sản phẩm khỏi database
    await Product.findByIdAndDelete(req.params.id);

    // 4. Vòng lặp xóa các file ảnh vật lý
    //imagesToDelete.forEach(imagePath => {
      // imagePath thường có dạng: "/uploads/ten-anh.jpg"
      // Chúng ta cần chuyển nó thành đường dẫn tuyệt đối trên ổ đĩa
      // __dirname là thư mục 'controllers', '..' để ra ngoài thư mục 'backend'
     // const fullPath = path.join(__dirname, '..', imagePath);

      // Kiểm tra file có tồn tại không rồi mới xóa
     // if (fs.existsSync(fullPath)) {
     //   fs.unlink(fullPath, (err) => {
      //    if (err) {
     //       console.error(`Lỗi khi xóa file ${fullPath}:`, err);
       //   } else {
         //   console.log(`Đã xóa file thành công: ${fullPath}`);
      //    }
      //  });
     // }
   // });


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