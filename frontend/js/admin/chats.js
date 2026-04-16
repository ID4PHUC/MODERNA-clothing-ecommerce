async function loadAiChatHistory() {
    const tbody = document.getElementById('adminAiChatTable');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải lịch sử chat...</td></tr>';
        
        // Gọi API lịch sử chat (Bạn đã tạo ở bước trước)
        const res = await fetch('/api/chat/history');
        const history = await res.json();

        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có dữ liệu chat.</td></tr>';
            return;
        }

        tbody.innerHTML = history.reverse().map(item => {
            const date = new Date(item.createdAt).toLocaleString('vi-VN');
            return `
                <tr>
                    <td><small>${date}</small></td>
                    <td style="color: #4338ca; font-weight: 500;">${item.message}</td>
                    <td style="color: #10b981; font-style: italic;">${item.reply}</td>
                    <td>
                        <button onclick="deleteChat('${item._id}')" style="color:red; border:none; background:none; cursor:pointer">Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Lỗi tải dữ liệu.</td></tr>';
    }
}

// Hàm xóa chat (Nếu cần)
window.deleteChat = async (id) => {
    if(confirm('Xóa bản ghi chat này?')) {
        await fetch(`/api/chat/history/${id}`, { method: 'DELETE' }); // Cần viết thêm API Delete ở backend
        loadAiChatHistory();
    }
}