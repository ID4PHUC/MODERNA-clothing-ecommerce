// js/checkout.js

// --- Utils ---
async function apiAuth(path, opts = {}) {
  opts.headers = opts.headers || {};
  const token = localStorage.getItem('token');
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, opts);
  if (res.status === 401) { 
    window.location.href = 'login.html'; 
    throw new Error('Unauthorized'); 
  }
  return res.json();
}

function formatCurrency(v) {
    const rounded = Math.round(v || 0);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

// --- BIẾN TOÀN CỤC ---
let currentCheckoutItems = []; 

// --- 1. HÀM LOAD DỮ LIỆU THANH TOÁN ---
async function loadCheckoutData() {
  const params = new URLSearchParams(window.location.search);
  const isBuyNow = params.get('buyNow') === 'true';

  if (isBuyNow) {
    const data = localStorage.getItem('temp_checkout');
    if (data) currentCheckoutItems = JSON.parse(data);
  } else {
    try {
      const res = await apiAuth('/api/cart');
      if (res.cart && res.cart.items) {
        currentCheckoutItems = res.cart.items.map(it => ({
          productId: it.product._id,
          title: it.product.title,
          price: it.product.price,
          discount: it.product.discount || 0,
          image: it.product.image,
          quantity: it.quantity,
          size: it.size,
          color: it.color
        }));
      }
    } catch (err) { console.error("Lỗi tải giỏ hàng:", err); }
  }
  renderOrderSummary(currentCheckoutItems);
}

// --- 2. HIỂN THỊ ĐƠN HÀNG ---
function renderOrderSummary(items) {
  const container = document.getElementById('orderItems');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px;">Giỏ hàng trống.</p>';
    return;
  }

  let subtotal = 0;
  container.innerHTML = items.map(it => {
    const discount = it.discount || 0;
    const finalPrice = Math.round(it.price * (1 - discount / 100));
    const itemTotal = finalPrice * it.quantity;
    subtotal += itemTotal;

    return `
      <div class="order-item" style="display:flex; gap:12px; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid #eee;">
        <img src="${it.image}" style="width:65px; height:85px; object-fit:cover; border-radius:6px;">
        <div style="flex:1">
          <div style="font-weight:600; font-size:14px; color:#111827;">${it.title}</div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">Phân loại: ${it.size} / ${it.color}</div>
          <div style="display:flex; justify-content:space-between; margin-top:8px;">
            <div style="display:flex; flex-direction:column;">
               <span style="font-size:13px; color:#64748b;">x${it.quantity}</span>
               ${discount > 0 ? `<span style="font-size:11px; color:#ef4444;">(Giảm ${discount}%)</span>` : ''}
            </div>
            <span style="font-weight:600; color:#111827;">${formatCurrency(itemTotal)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('total').textContent = formatCurrency(subtotal);
}

// --- 3. XỬ LÝ NÚT HOÀN TẤT ĐƠN HÀNG ---
document.addEventListener('DOMContentLoaded', () => {
  loadCheckoutData();
  fillCustomerInfo();

  const phoneInput = document.getElementById('custPhone');
  if (phoneInput) {
    phoneInput.oninput = function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    };
  }

  const btn = document.getElementById('completeOrderBtn');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('custName')?.value.trim();
    const phone = document.getElementById('custPhone')?.value.trim();
    const email = document.getElementById('custEmail')?.value.trim();
    const address = document.getElementById('custAddress')?.value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

    // Validate dữ liệu
    if(!name || !phone || !address) {
        alert("Vui lòng điền đầy đủ thông tin giao hàng!");
        return;
    }

    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(phone)) {
        alert("Số điện thoại không hợp lệ!");
        return;
    }
    
    if(!paymentMethod) {
        alert("Vui lòng chọn phương thức thanh toán!");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Đang xử lý...";

    try {
      const payload = { 
        address: { name, phone, email, detail: address },
        paymentMethod: paymentMethod,
        items: currentCheckoutItems.map(it => ({
            productId: it.productId, 
            quantity: it.quantity,
            size: it.size,
            color: it.color
        }))
      };

      const res = await apiAuth('/api/cart/checkout', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) 
      });

      if (res.success) {
        // Xóa dữ liệu giỏ hàng trước
        localStorage.removeItem('cart');
        localStorage.removeItem('temp_checkout');

        // KIỂM TRA: Nếu là thanh toán Online (MoMo/VNPay) có trả về link
        if (res.payUrl) {
          // CHUYỂN HƯỚNG SANG TRANG THANH TOÁN MOMO
          window.location.href = res.payUrl;
          return;
        }

        // Nếu là COD (Không có payUrl)
        alert('Đặt hàng thành công! Mã vận đơn: ' + (res.trackingCode || 'MODERNA-OK'));
        window.location.replace('index.html'); 

      } else {
        alert('Lỗi: ' + (res.error || 'Thanh toán thất bại'));
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.');
    } finally {
      btn.disabled = false;
      btn.textContent = "Hoàn tất đơn hàng";
    }
  });
});

function fillCustomerInfo() {
  const userData = localStorage.getItem('user');
  if (userData) {
    const user = JSON.parse(userData);
    if (user.name) document.getElementById('custName').value = user.name;
    if (user.phone) document.getElementById('custPhone').value = user.phone;
    if (user.email) document.getElementById('custEmail').value = user.email;
    if (user.address) document.getElementById('custAddress').value = user.address;
  }
}