const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 1. Khách gửi tin nhắn và AI trả lời
router.post('/', chatController.chatWithAI);

// 2. Lấy lịch sử (Dùng cho cả khách xem lại và Admin xem)
router.get('/history', chatController.getChatHistory);

// 3. Xóa 1 bản ghi cụ thể (Dùng cho nút Xóa trong Admin)
router.delete('/history/:id', chatController.deleteChatById);

module.exports = router;