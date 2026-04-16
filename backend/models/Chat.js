const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: { type: String, default: "anonymous" }, // Có thể lưu ID người dùng nếu đã đăng nhập
    message: String,
    reply: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);