const Category = require('../models/Category');

// 1. Lấy tất cả danh mục
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Thêm danh mục mới
exports.addCategory = async (req, res) => {
  try {
    let { name, parent, gender } = req.body; // Lấy thêm gender từ body
    
    if (!parent || parent === "" || parent === "null") parent = null;

    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

    const newCategory = new Category({
      name,
      parent,
      gender: gender || 'unisex', // Lưu vào database
      slug
    });

    await newCategory.save();
    res.status(201).json({ message: 'Thành công', category: newCategory });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. Xóa danh mục
exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa danh mục' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
