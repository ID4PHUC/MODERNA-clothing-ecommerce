// models/Category.js
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  parent: { type: String, default: null }, // Để phân biệt danh mục cha/con
  gender: { type: String, default: 'unisex' },
  slug: { type: String, lowercase: true } // Ví dụ: "ao-so-mi"
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);