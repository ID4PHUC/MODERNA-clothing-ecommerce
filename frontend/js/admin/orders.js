// js/admin/orders.js
import { api } from './api.js';

// 1. KHAI BÁO BIẾN TOÀN CỤC ĐỂ LƯU ID ĐƠN HÀNG ĐANG MỞ
let currentOrderId = null; 

/**
 * 1. Tải danh sách tất cả đơn hàng cho Admin
 */
export async function loadOrders() {
  const tbody = document.getElementById('adminOrdersTable');
  if (!tbody) return;

  const res = await api('/api/orders/all');
  let orders = Array.isArray(res) ? res : (res?.orders || []);

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không có đơn hàng nào.</td></tr>';
    return;
  }

  // Sắp xếp đơn hàng mới nhất lên đầu
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tbody.innerHTML = orders.map(o => {
    const orderDate = o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '---';
    return `
      <tr>
        <td>#${o._id.slice(-8).toUpperCase()}</td>
        <td>${o.address?.name || 'Khách hàng'}</td>
        <td>${orderDate}</td>
        <td>${o.items?.length || 0}</td>
        <td>${(o.total || 0).toLocaleString()} đ</td>
        <td><span class="badge-status status-${o.status || 'pending'}">${o.status || 'pending'}</span></td>
        <td><button class="view-order btn-edit" data-id="${o._id}">Xem</button></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.view-order').forEach(btn => {
    btn.onclick = () => showOrderDetail(btn.dataset.id);
  });
}

/**
 * 2. Hiển thị chi tiết đơn hàng
 */
async function showOrderDetail(orderId) {
  currentOrderId = orderId; 

  const modal = document.getElementById('orderDetailWrapper');
  const res = await api(`/api/orders/${orderId}`);
  if (!res) return;

  // Đổ thông tin cơ bản
  document.getElementById('viewOrderId').textContent = '#' + res._id.toUpperCase();
  
  if (res.createdAt) {
      const date = new Date(res.createdAt);
      document.getElementById('detDate').textContent = date.toLocaleString('vi-VN');
  }

  document.getElementById('detName').textContent = res.address?.name || 'N/A';
  document.getElementById('detPhone').textContent = res.address?.phone || 'N/A';
  document.getElementById('detAddress').textContent = res.address?.detail || 'N/A';
  document.getElementById('detEmail').textContent = res.address?.email || 'N/A';
  document.getElementById('detMethod').textContent = res.paymentMethod?.toUpperCase();
  
  // TỔNG TIỀN ĐƠN HÀNG (Đây là số tiền khách thực trả)
  document.getElementById('detTotal').textContent = (res.total || 0).toLocaleString() + ' đ';
  document.getElementById('updateStatusSelect').value = res.status || 'pending';

  const itemsTbody = document.getElementById('orderItemsList');
  
  // HIỂN THỊ DANH SÁCH MÓN HÀNG
  itemsTbody.innerHTML = res.items.map(it => {
    // Lưu ý: it.price ở đây là giá tại thời điểm khách bấm "Thanh toán"
    // Nếu bạn đã sửa Checkout thành công, it.price này ĐÃ LÀ GIÁ GIẢM.
    return `
    <tr>
      <td style="display:flex; align-items:center; gap:10px">
        <img src="${it.product?.image || 'img/no-image.png'}" width="40" height="40" style="object-fit:cover; border-radius:4px">
        <div style="display:flex; flex-direction:column">
            <span style="font-weight:500">${it.product?.title || 'Sản phẩm đã xóa'}</span>
            <!-- Hiển thị % giảm giá nếu backend có lưu, hoặc chỉ cần hiện đơn giá thực tế -->
        </div>
      </td>
      <td><small>${it.size} / ${it.color}</small></td>
      <td style="text-align:center">${it.quantity}</td>
      <td style="text-align:right">${(it.price || 0).toLocaleString()} đ</td>
      <td style="text-align:right; font-weight:bold">${((it.price || 0) * it.quantity).toLocaleString()} đ</td>
    </tr>
  `}).join('');

  modal.style.display = 'flex';
}

/**
 * 3. Xử lý lưu trạng thái mới của đơn hàng
 */
document.getElementById('btnSaveOrderStatus').onclick = async () => {
    //  Sử dụng currentOrderId thay vì orderId bị sai scope
    if (!currentOrderId) return alert("Không tìm thấy ID đơn hàng!");
    
    const newStatus = document.getElementById('updateStatusSelect').value;
    
    console.log("Đang cập nhật đơn hàng:", currentOrderId, "Trạng thái mới:", newStatus);

    const updateRes = await api(`/api/orders/${currentOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (updateRes && !updateRes.error) {
      alert('Cập nhật trạng thái thành công!');
      document.getElementById('orderDetailWrapper').style.display = 'none';
      loadOrders(); // Tải lại danh sách bảng ở phía sau
    } else {
      alert('Lỗi: ' + (updateRes?.error || 'Không rõ lỗi'));
    }
};

/**
 * 4. Xử lý đóng Modal
 */
document.getElementById('btnCloseOrderX')?.addEventListener('click', () => {
  document.getElementById('orderDetailWrapper').style.display = 'none';
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('orderDetailWrapper');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});