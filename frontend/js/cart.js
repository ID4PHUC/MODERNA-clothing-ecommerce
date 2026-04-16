// ================= cart.js =================
let isProcessing = false;

async function apiAuth(path, opts = {}) {
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('token');
  
  if (!token) return {}; 

  opts.headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(path, opts);

    if (res.status === 401) {
      showToast('Vui lòng đăng nhập lại', 'error');
      // location.href = 'login.html'; // Tùy chọn chuyển hướng
      return {}; 
    }

    if (!res.ok) {
        // Xử lý các lỗi khác như 404, 500
        console.error("Server error:", res.status);
        return {};
    }

    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("Network error:", error);
    return {};
  }
}


function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  container.innerHTML = ''; 
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

function formatCurrency(v = 0) {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

async function loadCart() {
  try {
    const data = await apiAuth('/api/cart');
    let items = (data.cart && data.cart.items) || [];
    items = items.filter(it => it.product && it.product._id);
    renderCart(items);
    if (typeof window.updateCartCount === 'function') {
        window.updateCartCount();
    }
    if (typeof updateCartCountFromItems === 'function') updateCartCountFromItems(items);
    attachCheckoutHandler();
  } catch (err) {
    console.error('loadCart error', err);
  }
}

// Để giỏ hàng hiển thị //
function renderCart(items) {
  const list = document.querySelector('.cart-list');
  const summary = document.querySelector('.cart-summary'); // Chọn vùng tóm tắt
  const layout = document.querySelector('.cart-layout');    // Chọn khung bao quanh
  const subtotalEl = document.getElementById('subtotal');
  const totalEl = document.getElementById('total');

  if (!list) return;

  // KIỂM TRA GIỎ HÀNG TRỐNG
  if (items.length === 0) {
    // 1. Hiển thị thông báo trống đẹp hơn
    list.innerHTML = `
      <div style="text-align:center; padding:80px 0; width: 100%;">
        <div style="font-size: 50px; margin-bottom: 20px;">🛒</div>
        <p style="font-size: 18px; color: #64748b;">Giỏ hàng của bạn đang trống.</p>
        <a href="collections.html" class="btn-primary" style="display:inline-block; margin-top:20px; text-decoration:none; padding: 12px 25px; border-radius: 8px;">
          Tiếp tục mua sắm
        </a>
      </div>`;

    // 2. ẨN VÙNG TÓM TẮT
    if (summary) summary.style.display = 'none';

    // 3. Đưa layout về dạng 1 cột (để thông báo nằm chính giữa màn hình)
    if (layout) layout.style.display = 'block';

    if (subtotalEl) subtotalEl.textContent = '0₫';
    if (totalEl) totalEl.textContent = '0₫';
    return;
  }

  // NẾU CÓ SẢN PHẨM TRONG GIỎ
  if (summary) summary.style.display = 'block'; // HIỆN LẠI TÓM TẮT
  if (layout) layout.style.display = 'grid';    // Trả về giao diện 2 cột ban đầu

  // Đổ dữ liệu sản phẩm (Giữ nguyên logic cũ của bạn)
  list.innerHTML = items.map(it => {
    const p = it.product;
    const qty = it.quantity || 1;
    const hasDiscount = p.discount && p.discount > 0;
    const finalPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;

    return `
      <div class="cart-item" data-id="${p._id}" data-size="${it.size}" data-color="${it.color}" style="display:flex;gap:15px;padding:15px 0;border-bottom:1px solid #eee;position:relative;">
        <img src="${p.image}" style="width:100px;border-radius:8px;object-fit:cover;">
        <div style="flex:1">
          <h3 style="font-size:16px; margin-bottom:5px;">${p.title}</h3>
          <p style="font-size:13px;color:#64748b;margin-bottom:5px;">Phân loại: ${it.size} / ${it.color}</p>
          <div class="cart-item-price">
            <span style="font-weight:600; color:#ef4444;">${formatCurrency(finalPrice)}</span>
            ${hasDiscount ? `<span style="text-decoration:line-through; color:#94a3b8; font-size:12px; margin-left:8px;">${formatCurrency(p.price)}</span>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
            <div style="display:flex;align-items:center;border:1px solid #ddd; border-radius:4px;">
              <button class="qty-decrease" style="padding:2px 10px; border:none; background:none; cursor:pointer;">-</button>
              <input type="number" value="${qty}" readonly style="width:35px;text-align:center;border:none; font-size:14px;">
              <button class="qty-increase" style="padding:2px 10px; border:none; background:none; cursor:pointer;">+</button>
            </div>
            <strong style="font-size:16px;">${formatCurrency(finalPrice * qty)}</strong>
          </div>
        </div>
        <button class="remove" style="position:absolute;top:15px;right:0;color:#ef4444;background:none;border:none;cursor:pointer;font-size:13px;">Xóa</button>
      </div>`;
  }).join('');

  // Tính lại tổng tiền
  const subtotal = items.reduce((s, it) => {
    const p = it.product;
    const finalPrice = p.discount > 0 ? Math.round(p.price * (1 - p.discount / 100)) : p.price;
    return s + (finalPrice * it.quantity);
  }, 0);

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (totalEl) totalEl.textContent = formatCurrency(subtotal);

  attachCartHandlers();
}

function attachCartHandlers() {
  const list = document.querySelector('.cart-list');
  if (!list) return;

  list.onclick = async e => {
    const btn = e.target;
    if (!btn.matches('.qty-increase,.qty-decrease,.remove')) return;
    if (isProcessing) return; 

    const item = btn.closest('.cart-item');
    const productId = item.dataset.id;
    const size = item.dataset.size;
    const color = item.dataset.color;
    const currentQty = Number(item.querySelector('input').value);

    let newQty = currentQty;
    if (btn.classList.contains('qty-increase')) newQty++;
    if (btn.classList.contains('qty-decrease')) newQty--;
    if (btn.classList.contains('remove')) newQty = 0;

    try {
      isProcessing = true;
      if (newQty <= 0) {
        // ĐÃ XÓA LỆNH CONFIRM Ở ĐÂY ĐỂ KHÔNG HỎI NỮA
        await apiAuth('/api/cart/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, size, color })
        });
        showToast('Đã xóa sản phẩm');
      } else {
        await apiAuth('/api/cart/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, size, color, quantity: newQty })
        });
      }
      await loadCart();
    } catch (err) {
      showToast('Lỗi cập nhật', 'error');
    } finally {
      isProcessing = false;
    }
  };
}

function attachCheckoutHandler() {
  const checkoutBtn = document.querySelector('.checkout');
  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      if (document.getElementById('subtotal').textContent === '0₫') return showToast('Giỏ hàng trống!', 'error');
      window.location.href = 'checkout.html';
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
});

// Hàm lấy token dùng chung cho đỡ viết lại nhiều lần
function getToken() {
  return localStorage.getItem('token');
}
