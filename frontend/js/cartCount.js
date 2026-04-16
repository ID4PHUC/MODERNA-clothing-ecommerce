function getToken() {
  return localStorage.getItem('token');
}

window.updateCartCount = async function () {
  const cartEl = document.querySelector('.cart-icon');
  if (!cartEl) return; // Thoát nếu navbar chưa load xong

  let badge = cartEl.querySelector('.cart-badge');
  const token = getToken();

  // --- KIỂM TRA TOKEN TRƯỚC KHI GỌI FETCH ---
  if (!token) {
    // Nếu không có token, xóa badge cũ (nếu có) rồi thoát luôn, không gọi API nữa
    if (badge) badge.remove();
    return; 
  }

  try {
    const res = await fetch('/api/cart', { 
      headers: { Authorization: 'Bearer ' + token } 
    });

    // Nếu token hết hạn hoặc sai (Server trả về 401)
    if (res.status === 401) {
      if (badge) badge.remove();
      // Tùy chọn: localStorage.removeItem('token'); // Xóa luôn token rác
      return;
    }

    if (!res.ok) {
      if (badge) badge.remove();
      return;
    }

    const data = await res.json();
    // Kiểm tra cấu trúc data trả về (tùy API của bạn là data.cart.items hay data.items)
    const items = data?.cart?.items || data?.items || [];
    const count = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

    if (count <= 0) {
      if (badge) badge.remove();
      return;
    }

    // Nếu chưa có badge thì tạo mới
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -8px;
        background: #ff4d4f;
        color: #fff;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        border: 2px solid #fff;
        z-index: 10;
      `;
      cartEl.style.position = 'relative';
      cartEl.appendChild(badge);
    }

    // Cập nhật số lượng
    badge.textContent = count > 99 ? '99+' : count;

  } catch (err) {
    // Chỉ log lỗi thực sự (như rớt mạng), không log lỗi 401 nữa
    console.error('updateCartCount error:', err);
  }
};