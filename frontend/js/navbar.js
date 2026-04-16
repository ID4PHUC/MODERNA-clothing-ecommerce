// js/navbar.js

document.addEventListener("DOMContentLoaded", function () {
  const navPlaceholder = document.getElementById("navbar-container");

  if (navPlaceholder) {
    fetch("navbar.html")
      .then((response) => {
        if (!response.ok) throw new Error("Không thể tải file navbar.html");
        return response.text();
      })
      .then((data) => {
        navPlaceholder.innerHTML = data;

        // --- GỌI CÁC HÀM XỬ LÝ SAU KHI NAVBAR ĐÃ XUẤT HIỆN ---
        setTimeout(() => {
          checkSession(); // Gọi hàm kiểm tra đăng nhập
          updateCartCount(); 
          loadMegaMenus();
        }, 50);
      })
      .catch((error) => console.error("Lỗi tải navbar:", error));
  }
});

/**
 * 1. LOAD MEGA MENUS DỰA TRÊN CATEGORY TỪ DATABASE
 */
async function loadMegaMenus() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    if (!categories || categories.error || !Array.isArray(categories)) return;

    const renderByGender = (genderValue, containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const parents = categories.filter(c => 
        (!c.parent || c.parent === "null" || c.parent === "") && 
        (c.gender === genderValue || c.gender === 'unisex')
      );

      let htmlContent = parents.map(parent => {
        const children = categories.filter(c => 
          c.parent === parent._id && 
          (c.gender === genderValue || c.gender === 'unisex')
        );

        return `
          <div class="mega-col">
            <h4 class="mega-title">${parent.name}</h4>
            <ul class="mega-list">
              ${children.map(child => `
                <li><a href="collections.html?category=${child._id}">${child.name}</a></li>
              `).join('')}
              <li><a href="collections.html?category=${parent._id}" class="view-all">Xem tất cả ${parent.name}</a></li>
            </ul>
          </div>
        `;
      }).join('');

      container.innerHTML = htmlContent || '<p style="padding:20px; color:#999">Đang cập nhật...</p>';
    };

    renderByGender('male', 'men-menu-content');
    renderByGender('female', 'women-menu-content');
    renderByGender('unisex', 'sale-menu-content');

  } catch (err) {
    console.error("Lỗi khi load danh mục Menu:", err);
  }
}

/**
 * 2. CẬP NHẬT SỐ LƯỢNG GIỎ HÀNG
 */
window.updateCartCount = async function () {
  const cartEl = document.querySelector('.cart-icon');
  if (!cartEl) return;

  const token = localStorage.getItem('token');
  let badge = cartEl.querySelector('.cart-badge');

  if (!token) {
    if (badge) badge.remove();
    return;
  }

  try {
    const res = await fetch('/api/cart', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (res.status === 401) {
      if (badge) badge.remove();
      return;
    }

    if (!res.ok) return;

    const data = await res.json();
    const items = data?.cart?.items || data?.items || [];
    const count = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

    if (count <= 0) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.style.cssText = `
        position: absolute; top: -5px; right: -8px;
        background: #ff4d4f; color: #fff; border-radius: 50%;
        width: 18px; height: 18px; font-size: 11px;
        display: flex; align-items: center; justify-content: center;
        font-weight: bold; border: 2px solid #fff; z-index: 10;
      `;
      cartEl.style.position = 'relative';
      cartEl.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count;

  } catch (err) {
    console.error('Lỗi updateCartCount:', err);
  }
};

/**
 * 3. KIỂM TRA ĐĂNG NHẬP VÀ HIỂN THỊ DROPDOWN
 */
function checkSession() {
  const authArea = document.getElementById("nav-auth-area");
  if (!authArea) return;

  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  let user = null;

  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    user = null;
  }

  if (token && user) {
    // --- PHẦN KIỂM TRA THÔNG TIN CÒN THIẾU ---
    // Kiểm tra nếu thiếu SĐT hoặc Địa chỉ và không phải đang ở trang profile
    // Thêm kiểm tra isAdmin: Thường thì Admin không cần bắt buộc, nhưng tùy bạn
    if (!user.isAdmin && (!user.phone || !user.address) && !window.location.pathname.includes('profile.html')) {
        alert('Vui lòng hoàn thiện thông tin Số điện thoại và Địa chỉ trước khi tiếp tục!');
        window.location.href = 'profile.html';
        return; // Dừng lại không chạy code bên dưới nữa
    }

    // --- LOGIC HIỂN THỊ DROPDOWN (Giữ nguyên của bạn) ---
    const displayName = user.name || user.username || user.email.split('@')[0] || "User";
    const firstLetter = displayName.charAt(0).toUpperCase();
    const isAdmin = user.isAdmin === true || user.isAdmin === "true" || (user.role && user.role.toString().toLowerCase() === 'admin');

    authArea.innerHTML = `
      <div class="user-dropdown-container">
        <div class="user-trigger">
          <div class="user-letter-avatar">${firstLetter}</div>
          <span class="user-name">Hi, ${displayName}</span>
        </div>
        <div class="user-menu">
          <div class="menu-arrow"></div>
          ${isAdmin ? `<a href="admin.html" class="menu-item link-admin">Admin Panel</a>` : ""}
          <a href="profile.html" class="menu-item">Tài Khoản Của Tôi</a>
          <a href="orders.html" class="menu-item">Đơn Mua</a>
          <hr>
          <a href="#" id="logout-link" class="menu-item link-logout">Đăng Xuất</a>
        </div>
      </div>
    `;

    document.getElementById("logout-link").addEventListener("click", function(e) {
      e.preventDefault();
      logout();
    });

  } else {
    authArea.innerHTML = `<a href="login.html" class="btn-signin">Sign In</a>`;
  }
}


/**
 * 4. HÀM ĐĂNG XUẤT
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html"; 
}