/**
 * PHẦN 1: TỰ ĐỘNG NẠP GIAO DIỆN HTML
 */
document.addEventListener("DOMContentLoaded", function () {
    // Gọi file html giao diện vào trang
    fetch("ai-chat.html")
        .then(response => {
            if (!response.ok) throw new Error("Không tìm thấy file ai-chat.html");
            return response.text();
        })
        .then(data => {
            // Tạo một div chứa và chèn vào cuối body
            const chatDiv = document.createElement('div');
            chatDiv.innerHTML = data;
            document.body.appendChild(chatDiv);

            // Sau khi giao diện đã xuất hiện, mới bắt đầu chạy logic
            loadHistory(); 
            setupEventListeners();
        })
        .catch(error => console.error("Lỗi nạp khung chat:", error));
});

// Hàm gán sự kiện cho ô input
function setupEventListeners() {
    const inputField = document.getElementById('user-msg');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.sendMsg();
        });
    }
}

// 1. Hàm bật/tắt khung chat
window.toggleChat = function() {
    const box = document.getElementById('chat-box');
    if (box) {
        box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'flex' : 'none';
    }
};

// 2. Hàm lấy ID định danh khách hàng 
function getAnonymousId() {
    let id = localStorage.getItem('chat_user_id');
    if (!id) {
        id = 'guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chat_user_id', id);
    }
    return id;
}

// 3. Hàm hiển thị tin nhắn lên màn hình
function appendMessage(text, className) {
    const content = document.getElementById('chat-content');
    if (!content) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${className}`;
    msgDiv.innerText = text;
    content.appendChild(msgDiv);
    
    // Tự động cuộn xuống tin nhắn mới nhất
    content.scrollTop = content.scrollHeight;
}

// 4. Hàm nạp lại lịch sử khi load trang (Để không bị mất tin nhắn)
async function loadHistory() {
    const userId = getAnonymousId();
    const content = document.getElementById('chat-content');
    if (!content) return;

    try {
        const res = await fetch(`/api/chat/history?userId=${userId}`);
        const history = await res.json();
        
        if (history && history.length > 0) {
            content.innerHTML = ''; // Xóa tin nhắn mặc định nếu đã có lịch sử cũ
            history.forEach(item => {
                if (item.message) appendMessage(item.message, 'user-msg');
                if (item.reply) appendMessage(item.reply, 'ai-msg');
            });
        }
    } catch (err) {
        console.error("Lỗi nạp lịch sử:", err);
    }
}

// 5. Hàm gửi tin nhắn
window.sendMsg = async function() {
    const input = document.getElementById('user-msg');
    const msg = input.value.trim();
    if (!msg) return;

    // Hiển thị tin nhắn của khách lên màn hình
    appendMessage(msg, 'user-msg');
    input.value = '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' // ĐÃ SỬA LỖI Ở ĐÂY
            },
            body: JSON.stringify({ 
                message: msg, 
                userId: getAnonymousId() 
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            appendMessage(data.reply, 'ai-msg');
        } else {
            appendMessage("AI đang bận: " + (data.reply || "Lỗi server"), 'ai-msg');
        }
    } catch (err) {
        console.error("Lỗi fetch:", err);
        appendMessage("Lỗi kết nối AI. Vui lòng kiểm tra Backend!", 'ai-msg');
    }
};

