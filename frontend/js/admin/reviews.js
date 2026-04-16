// js/admin/reviews.js
import { api } from './api.js';

export async function loadReviews() {
    const tbody = document.getElementById('adminReviewsTable');
    const searchInput = document.getElementById('reviewSearch'); // Lấy ô tìm kiếm từ HTML
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải dữ liệu...</td></tr>';
        
        // 1. Gọi API
        const reviews = await api('/api/reviews'); 
        
        // 2. KIỂM TRA PHÒNG VỆ: Nếu reviews không phải là mảng (do lỗi 404, 500...)
        if (!Array.isArray(reviews)) {
            console.error("Dữ liệu không hợp lệ:", reviews);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Lỗi kết nối Server hoặc không tìm thấy API.</td></tr>';
            return;
        }

        if (reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có đánh giá nào.</td></tr>';
            return;
        }

        // 3. HÀM RENDER (Tách ra để dùng cho cả Tìm kiếm)
        const displayData = (dataList) => {
            if (dataList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Không tìm thấy đánh giá phù hợp.</td></tr>';
                return;
            }

            tbody.innerHTML = dataList.map(rev => {
                const date = new Date(rev.createdAt).toLocaleString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const stars = '⭐'.repeat(rev.rating);

                return `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px">
                                <img src="${rev.product?.image || 'img/no-image.png'}" width="40" height="40" style="object-fit:cover; border-radius:4px">
                                <span style="font-size:13px; font-weight:500">${rev.product?.title || '<i style="color:red">Sản phẩm đã xóa</i>'}</span>
                            </div>
                        </td>
                        <td>
                            <div style="font-size:13px">
                                <strong>${rev.user?.fullName || rev.user?.name || 'Khách ẩn danh'}</strong><br>
                                <span style="color: #888;">${rev.user?.email || ''}</span>
                            </div>
                        </td>
                        <td><span style="color: #f59e0b">${stars}</span> <small>(${rev.rating})</small></td>
                        <td style="max-width: 250px; font-size: 13px; color: #475569; line-height:1.4">
                            ${rev.comment || '<i style="color:#ccc">Không có nội dung</i>'}
                        </td>
                        <td><small>${date}</small></td>
                        <td>
                            <button class="delete-review" data-id="${rev._id}" 
                                style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Xóa
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Gán lại sự kiện xóa sau khi render
            attachDeleteEvents();
        };

        // 4. LẮNG NGHE SỰ KIỆN TÌM KIẾM
        if (searchInput) {
            searchInput.oninput = (e) => {
                const keyword = e.target.value.toLowerCase();
                const filtered = reviews.filter(r => 
                    (r.product?.title || "").toLowerCase().includes(keyword) ||
                    (r.comment || "").toLowerCase().includes(keyword) ||
                    (r.user?.fullName || "").toLowerCase().includes(keyword)
                );
                displayData(filtered);
            };
        }

        // 5. HÀM XỬ LÝ XÓA
        const attachDeleteEvents = () => {
            tbody.querySelectorAll('.delete-review').forEach(btn => {
                btn.onclick = async () => {
                    if (confirm('Bạn có chắc chắn muốn xóa đánh giá này không?')) {
                        const res = await api(`/api/reviews/${btn.dataset.id}`, { method: 'DELETE' });
                        if (res && !res.error) {
                            loadReviews(); // Tải lại toàn bộ danh sách
                        } else {
                            alert('Lỗi: ' + (res.error || 'Không thể xóa'));
                        }
                    }
                };
            });
        };

        // Khởi tạo hiển thị lần đầu
        displayData(reviews);

    } catch (err) {
        console.error("Lỗi load reviews:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Lỗi tải dữ liệu đánh giá.</td></tr>';
    }
}