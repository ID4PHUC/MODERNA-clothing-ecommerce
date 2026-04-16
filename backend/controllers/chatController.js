const Groq = require("groq-sdk");
const Chat = require("../models/Chat");

const chatWithAI = async (req, res) => {
    // Frontend cần gửi message và userId (lấy từ localStorage)
    const { message, userId } = req.body; 
    const apiKey = process.env.GROQ_API_KEY;

    try {
        const groq = new Groq({ apiKey: apiKey });
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Bạn là nhân viên hỗ trợ shop Moderna. Trả lời ngắn gọn, lịch sự bằng tiếng Việt." },
                { role: "user", content: message },
            ],
            model: "llama-3.1-8b-instant",
        });

        const reply = chatCompletion.choices[0]?.message?.content || "";

        // Lưu vào DB kèm userId để sau này lọc đúng người đó
        const newChat = new Chat({
            userId: userId || "anonymous", 
            message: message,
            reply: reply
        });
        await newChat.save(); 

        res.json({ reply: reply });

    } catch (error) {
        console.error("Lỗi Groq AI:", error);
        res.status(500).json({ reply: "AI đang bận, thử lại sau nhé!" });
    }
};

// SỬA HÀM NÀY: Để lọc lịch sử theo từng khách hàng
const getChatHistory = async (req, res) => {
    try {
        // Lấy userId từ query string (VD: /api/chat/history?userId=abc)
        const { userId } = req.query; 
        
        // Nếu có userId thì chỉ lấy của người đó, nếu không có (Admin xem) thì lấy hết
        const filter = userId ? { userId: userId } : {};

        const history = await Chat.find(filter).sort({ createdAt: 1 }).limit(100);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Không lấy được lịch sử." });
    }
};

const deleteChatById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedChat = await Chat.findByIdAndDelete(id);
        if (!deletedChat) return res.status(404).json({ error: "Không tìm thấy." });
        res.json({ message: "Thành công" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi" });
    }
};

module.exports = { chatWithAI, getChatHistory, deleteChatById };