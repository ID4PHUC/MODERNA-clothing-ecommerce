/* ================= HERO SLIDER (Chuyển banner banner) ================= */
const slides = document.querySelectorAll('.hero-bg');
const nextBtn = document.querySelector('.hero-btn.next');
const prevBtn = document.querySelector('.hero-btn.prev');
let slideIndex = 0;

function showSlide(index) {
  if (!slides.length) return;
  slides.forEach(s => s.classList.remove('active'));
  slides[index].classList.add('active');
}

nextBtn?.addEventListener('click', () => {
  slideIndex = (slideIndex + 1) % slides.length;
  showSlide(slideIndex);
});

prevBtn?.addEventListener('click', () => {
  slideIndex = (slideIndex - 1 + slides.length) % slides.length;
  showSlide(slideIndex);
});

// Tự động chuyển slide sau mỗi 5 giây
setInterval(() => {
  if (slides.length > 0) {
    slideIndex = (slideIndex + 1) % slides.length;
    showSlide(slideIndex);
  }
}, 5000);

/* ================= FETCH UTILS (Hàm bổ trợ) ================= */
async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Fetch failed');
    return data;
  } catch (err) {
    console.error('Fetch error:', url, err);
    return null;
  }
}

function formatCurrency(value = 0) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

/* ================= RENDER PRODUCTS HOME (Hiển thị sản phẩm thông minh) ================= */
/**
 * @param {string} rootName - Tên danh mục gốc (Áo hoặc Quần)
 * @param {string} gender - male / female / unisex
 * @param {string} sectionId - ID của thẻ <section> chứa cả tiêu đề và grid
 */

async function renderHomeSection(rootName, gender, sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  // 1. Gọi API lấy Sản phẩm, Danh mục và Đánh giá (Giữ nguyên của bạn)
  const [products, categories, reviews] = await Promise.all([
    fetchJSON('/api/products') || [],
    fetchJSON('/api/categories') || [],
    fetchJSON('/api/reviews') || [] // Thêm mảng rỗng để phòng lỗi
  ]);

  if (!products || !categories || products.length === 0) return;

  const rootCategory = categories.find(c => c.name === rootName && (c.parent === null || c.parent === "null" || !c.parent));
  if (!rootCategory) {
    console.warn(`Không tìm thấy danh mục gốc: ${rootName}`);
    return;
  }

  const h2 = section.querySelector('h2');
  const viewAllBtn = section.querySelector('.view-all-link');
  const gridContainer = section.querySelector('.product-grid-list');

  const genderText = gender === 'male' ? 'Nam' : (gender === 'female' ? 'Nữ' : '');
  if (h2) h2.textContent = `Bộ sưu tập ${rootCategory.name} ${genderText}`;
  if (viewAllBtn) {
    viewAllBtn.href = `collections.html?category=${rootCategory._id}${gender ? '&gender=' + gender : ''}`;
  }

  function isChildOf(catId, parentId) {
    if (catId === parentId) return true;
    let current = categories.find(x => x._id === catId);
    while (current && current.parent) {
      if (current.parent === parentId) return true;
      current = categories.find(x => x._id === current.parent);
    }
    return false;
  }

  const filtered = products.filter(p => {
    const belongsToRoot = isChildOf(p.category, rootCategory._id);
    const matchesGender = !gender || p.gender === gender;
    return belongsToRoot && matchesGender;
  }).slice(0, 4); 

  if (!gridContainer) return;
  if (filtered.length === 0) {
    gridContainer.innerHTML = '<p style="padding: 20px; color: #888;">Đang cập nhật sản phẩm...</p>';
    return;
  }

  gridContainer.innerHTML = filtered.map(p => {
    // A. TÍNH TOÁN GIÁ (Giữ nguyên của bạn)
    const hasDiscount = p.discount && p.discount > 0;
    const finalPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;

    // B. MỚI: TÍNH TOÁN SAO ĐÁNH GIÁ
    const prodReviews = reviews.filter(r => (r.product?._id || r.product) === p._id);
    const avgRating = prodReviews.length > 0 
        ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length) 
        : 0;

    return `
    <div class="product-card">
      <div class="product-thumb">
        <a href="product.html?id=${p._id}">
          <img src="${p.image}" alt="${p.title}" loading="lazy">
        </a>
        
        ${hasDiscount ? `<span class="discount-badge">Giảm giá ${p.discount}%</span>` : ''}

        <a href="product.html?id=${p._id}" class="view-detail-icon">
          <i class="fa-solid fa-cart-shopping"></i>
        </a>
      </div>
      <div class="product-info">
        <h3 class="product-title">${p.title}</h3>
        
        <!-- PHẦN MỚI: HIỂN THỊ SAO -->
        <div class="product-rating-home" style="margin-bottom: 6px; font-size: 11px; color: #f59e0b;">
            ${avgRating > 0 
                ? renderStarsHome(Math.round(avgRating)) + ` <span style="color: #94a3b8; margin-left:4px;">(${prodReviews.length})</span>` 
                : '<span style="color: #cbd5e1;">Chưa có đánh giá</span>'}
        </div>

        <div class="product-price">
          <span class="new-price">${formatCurrency(finalPrice)}</span>
          ${hasDiscount ? `<span class="old-price">${formatCurrency(p.price)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// 2. MỚI: HÀM PHỤ ĐỂ VẼ SAO (Thêm vào cuối file index.js)
function renderStarsHome(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating 
            ? '<i class="fa-solid fa-star"></i>' 
            : '<i class="fa-regular fa-star" style="color: #cbd5e1;"></i>';
    }
    return stars;
}

/* ================= SNOW EFFECT (Tuyết rơi) ================= */
function initSnow(count = 50) {
  for (let i = 0; i < count; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.style.left = Math.random() * window.innerWidth + 'px';
    flake.style.animationDuration = (5 + Math.random() * 10) + 's';
    flake.style.animationDelay = Math.random() * 5 + 's';
    flake.style.width = flake.style.height = (Math.random() * 5 + 2) + 'px';
    document.body.appendChild(flake);
  }
}

/* ================= KHỞI TẠO KHI TRANG LOAD ================= */
document.addEventListener('DOMContentLoaded', () => {
  /** 
   * Cấu hình hiển thị trang chủ:
   * renderHomeSection( Tên danh mục gốc, Giới tính, ID của Section trong HTML )
   */
  
  // Đổ dữ liệu cho NAM
  renderHomeSection('Áo', 'male', 'section-men-shirts');
  renderHomeSection('Quần', 'male', 'section-men-pants');

  // Đổ dữ liệu cho NỮ
  renderHomeSection('Áo', 'female', 'section-women-shirts');
  renderHomeSection('Quần', 'female', 'section-women-pants');
  
  // Khởi tạo hiệu ứng tuyết rơi (nếu có hàm này)
  if (typeof initSnow === 'function') {
    initSnow(60);
  }
});