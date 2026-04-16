const $ = selector => document.querySelector(selector);

// --- 1. UTILS ---
function getToken() { return localStorage.getItem('token'); }

function formatCurrency(v) {
    const rounded = Math.round(v || 0);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

let currentProduct = null;
let isSubmitting = false;

// --- 2. LOAD CHI TIẾT SẢN PHẨM ---
async function loadProductDetail() {
    const id = getProductIdFromUrl();
    if (!id) return;

    try {
        const [prodRes, catRes] = await Promise.all([
            fetch(`/api/products/${id}`),
            fetch('/api/categories')
        ]);

        if (!prodRes.ok) return;
        currentProduct = await prodRes.json();
        const allCategories = await catRes.json();

        if ($('#title')) $('#title').textContent = currentProduct.title;
        
        // Hiển thị giá sản phẩm chính
        if ($('#price')) {
            const hasDiscount = currentProduct.discount && currentProduct.discount > 0;
            const finalPrice = hasDiscount ? currentProduct.price * (1 - currentProduct.discount / 100) : currentProduct.price;
            
            if (hasDiscount) {
                $('#price').innerHTML = `
                    <span style="color: #ef4444; font-size: 1.2em; font-weight: 800;">${formatCurrency(finalPrice)}</span>
                    <span style="text-decoration: line-through; color: #94a3b8; font-size: 0.8em; margin-left: 10px;">${formatCurrency(currentProduct.price)}</span>
                    <span style="background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.7em; margin-left: 10px; vertical-align: middle;">Giảm giá ${currentProduct.discount}%</span>
                `;
            } else {
                $('#price').textContent = formatCurrency(currentProduct.price);
            }
        }

        if ($('#desc')) $('#desc').textContent = currentProduct.description || 'Sản phẩm cao cấp từ MODERNA.';

        const images = (currentProduct.images && currentProduct.images.length > 0) ? currentProduct.images : [currentProduct.image];
        if ($('#mainImage')) $('#mainImage').src = images[0];
        if ($('#thumbnailContainer')) {
            $('#thumbnailContainer').innerHTML = images.map((imgUrl, index) => `
                <img src="${imgUrl}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="changeProductImage(this)">
            `).join('');
        }

        renderBreadcrumb(currentProduct, allCategories);
        renderVariants(currentProduct);
        setupActionButtons();
        
        // Gọi hàm load sản phẩm liên quan
        renderRelatedProducts(currentProduct._id, currentProduct.category);
    } catch (err) { console.error('Lỗi load chi tiết sản phẩm:', err); }
}

// --- 3. SẢN PHẨM LIÊN QUAN ---
async function renderRelatedProducts(currentId, category) {
    const container = $('#relatedProducts');
    const viewAllBtn = $('#viewAllRelated'); // Lấy nút xem tất cả
    if (!container) return;

    try {
        const res = await fetch(`/api/products?category=${category || ''}`);
        const products = await res.json();
        
        // 1. Lọc bỏ sản phẩm hiện tại và CHỈ LẤY 4 CÁI (.slice(0, 4))
        const related = products.filter(p => p._id !== currentId).slice(0, 4);

        // 2. Cập nhật link cho nút "Xem tất cả" để dẫn đến đúng danh mục đó
        if (viewAllBtn && category) {
            viewAllBtn.href = `collections.html?category=${category}`;
        }

        // 3. Render sản phẩm ra giao diện
        container.innerHTML = related.map(p => {
            const hasDiscount = p.discount && p.discount > 0;
            const finalPrice = hasDiscount ? p.price * (1 - p.discount / 100) : p.price;

            return `
                <div class="related-card" onclick="window.location.href='product.html?id=${p._id}'" style="cursor:pointer; position: relative;">
                    ${hasDiscount ? `<span class="discount-tag-small" style="position: absolute; top: 10px; left: 10px; background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; z-index: 2;">Giảm giá ${p.discount}%</span>` : ''}
                    
                    <img src="${p.image}" alt="${p.title}" style="width:100%; border-radius:8px;">
                    
                    <div class="related-info" style="margin-top: 10px;">
                        <div class="related-title" style="font-weight: 500; font-size: 14px;">${p.title}</div>
                        <div class="related-price-box" style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                            <span style="font-weight: bold; color: #111;">${formatCurrency(finalPrice)}</span>
                            ${hasDiscount ? `<span style="text-decoration: line-through; color: #94a3b8; font-size: 0.85em;">${formatCurrency(p.price)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Nếu không có sản phẩm liên quan nào, ẩn cả section
        if (related.length === 0) {
            $('.related-products').style.display = 'none';
        }

    } catch (err) { console.error(err); }
}

// --- 4. XỬ LÝ BIẾN THỂ ---
function renderVariants(product) {
    const sizeCon = $('#sizeContainer');
    const colorCon = $('#colorContainer');
    if (sizeCon && product.sizes?.length > 0) {
        $('#sizeSection').style.display = 'block';
        sizeCon.innerHTML = product.sizes.map(s => `<button class="btn-outline variant-btn" data-value="${s}">${s}</button>`).join('');
    }
    if (colorCon && product.colors?.length > 0) {
        $('#colorSection').style.display = 'block';
        colorCon.innerHTML = product.colors.map(c => `<button class="btn-outline variant-btn" data-value="${c}">${c}</button>`).join('');
    }
    handleVariantClick();
}

function handleVariantClick() {
    document.querySelectorAll('.variant-btn').forEach(btn => {
        btn.onclick = function() {
            this.parentElement.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        };
    });
}

// --- 5. GIỎ HÀNG & MUA NGAY ---
function getSelectionData() {
    const activeSizeBtn = document.querySelector('#sizeContainer .variant-btn.active');
    const activeColorBtn = document.querySelector('#colorContainer .variant-btn.active');
    const selectedSize = activeSizeBtn ? activeSizeBtn.getAttribute('data-value') : null;
    const selectedColor = activeColorBtn ? activeColorBtn.getAttribute('data-value') : null;

    if (currentProduct.sizes?.length > 0 && !selectedSize) { showToast('Vui lòng chọn Size!', 'error'); return null; }
    if (currentProduct.colors?.length > 0 && !selectedColor) { showToast('Vui lòng chọn Màu sắc!', 'error'); return null; }

    return {
        productId: currentProduct._id,
        title: currentProduct.title,
        price: currentProduct.price,
        discount: currentProduct.discount || 0, 
        image: currentProduct.image,
        quantity: parseInt($('.qty-input')?.value || 1),
        size: selectedSize || 'Mặc định',
        color: selectedColor || 'Mặc định'
    };
}

function setupActionButtons() {
    $('#addToCart').onclick = async () => {
        if (isSubmitting) return;
        const token = getToken();
        if (!token) { sessionStorage.setItem('redirectAfterLogin', window.location.href); window.location.href = 'login.html'; return; }
        const data = getSelectionData();
        if (!data) return;
        try {
            isSubmitting = true;
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(data)
            });
            if (res.ok) { showToast('Đã thêm vào giỏ hàng!', 'success'); updateCartCount(); }
        } catch (err) { console.error(err); } finally { isSubmitting = false; }
    };

    $('#buyNow').onclick = () => {
        const data = getSelectionData();
        if (!data) return;
        localStorage.setItem('temp_checkout', JSON.stringify([data]));
        window.location.href = 'checkout.html?buyNow=true';
    };
}

// --- 6. UI HELPERS ---
window.changeProductImage = function(el) {
    $('#mainImage').src = el.src;
    document.querySelectorAll('.thumb-img').forEach(img => img.classList.remove('active'));
    el.classList.add('active');
};

//link danh  muc  tren sp //
function renderBreadcrumb(product, categories) {
    const container = $('#breadcrumb');
    if (!container) return;

    const genderMap = { 'male': 'Nam', 'female': 'Nữ', 'unisex': 'Unisex' };
    
    // 1. Tìm danh mục hiện tại của sản phẩm
    const currentCat = categories.find(c => c._id === product.category);
    
    let breadcrumbHTML = `<a href="index.html">Trang chủ</a> / `;
    breadcrumbHTML += `<a href="collections.html?gender=${product.gender}">${genderMap[product.gender]}</a> / `;

    if (currentCat) {
        // 2. Tìm ID danh mục cha (Kiểm tra cả .parent và .parentId)
        const parentId = currentCat.parent || currentCat.parentId;

        if (parentId && parentId !== "" && parentId !== "null") {
            const parentCat = categories.find(c => c._id === parentId);
            if (parentCat) {
                // Hiển thị danh mục CHA (Ví dụ: Quần)
                breadcrumbHTML += `<a href="collections.html?category=${parentCat._id}">${parentCat.name}</a> / `;
            }
        }

        // 3. Hiển thị danh mục HIỆN TẠI (Ví dụ: Quần tây)
        breadcrumbHTML += `<a href="collections.html?category=${currentCat._id}">${currentCat.name}</a> / `;
    }

    // 4. Tên sản phẩm
    breadcrumbHTML += `<span>${product.title}</span>`;

    container.innerHTML = breadcrumbHTML;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    container.innerHTML = `<div class="toast ${type}">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 3000);
}


// --- 7. QUẢN LÝ ĐÁNH GIÁ (HIỂN THỊ 5 CÁI, CÓ XEM THÊM) ---
let allProductReviews = []; // Lưu trữ toàn bộ đánh giá của SP này
let reviewsVisible = 5;      // Số lượng hiển thị ban đầu

async function loadReviews() {
    const productId = getProductIdFromUrl();
    const reviewsList = $('#reviews-list');
    const loadMoreContainer = $('#load-more-reviews-container');
    const loadMoreBtn = $('#btn-load-more-reviews');

    if (!reviewsList) return;

    try {
        const res = await fetch('/api/reviews'); 
        const data = await res.json();

        // Lọc lấy đánh giá của sản phẩm hiện tại
        allProductReviews = data.filter(r => r.product && (r.product._id === productId || r.product === productId));

        if (allProductReviews.length === 0) {
            reviewsList.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">Chưa có đánh giá nào cho sản phẩm này.</p>';
            loadMoreContainer.style.display = 'none';
            return;
        }

        // 1. Cập nhật phần tóm tắt sao (Header)
        renderReviewSummary(allProductReviews);

        // 2. Hiển thị 5 cái đầu tiên
        renderReviewCards();

        // 3. Xử lý nút Xem thêm
        if (allProductReviews.length > reviewsVisible) {
            loadMoreContainer.style.display = 'block';
        }

        loadMoreBtn.onclick = () => {
            reviewsVisible += 5; // Tăng thêm 5 cái mỗi lần bấm
            renderReviewCards();
            if (reviewsVisible >= allProductReviews.length) {
                loadMoreContainer.style.display = 'none'; // Hết đánh giá thì ẩn nút
            }
        };

    } catch (err) {
        console.error('Lỗi tải đánh giá:', err);
    }
}

// Hàm render danh sách card
function renderReviewCards() {
    const reviewsList = $('#reviews-list');
    // Chỉ lấy một phần của mảng dựa trên reviewsVisible
    const toDisplay = allProductReviews.slice(0, reviewsVisible);

    reviewsList.innerHTML = toDisplay.map(r => `
        <div class="review-card" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; animation: fadeIn 0.5s ease;">
            <div class="review-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="review-user" style="display: flex; gap: 12px; align-items: center;">
                    <div class="review-user-avatar" style="width: 40px; height: 40px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid #dbeafe;">
                        ${(r.user?.name || 'K').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #1e293b; font-size: 15px;">${r.user?.name || 'Khách hàng'}</div>
                        <div class="review-stars" style="color: #f59e0b; font-size: 12px; margin-top: 2px;">
                            ${renderStars(r.rating)} 
                            <span style="color: #10b981; margin-left: 8px; font-size: 11px;"><i class="fa-solid fa-circle-check"></i> Đã mua hàng</span>
                        </div>
                    </div>
                </div>
                <div class="review-date" style="font-size: 12px; color: #94a3b8;">${new Date(r.createdAt).toLocaleDateString('vi-VN')}</div>
            </div>
            <div class="review-content" style="margin-top: 12px; color: #475569; padding-left: 52px; font-size: 14px; line-height: 1.6;">
                ${r.comment || '<i style="color: #cbd5e1;">Khách hàng không để lại bình luận.</i>'}
            </div>
        </div>
    `).join('');
}

// Hàm render tóm tắt sao ở trên đầu
function renderReviewSummary(reviews) {
    const total = reviews.length;
    const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1);
    
    if($('#avg-rating')) $('#avg-rating').textContent = avg;
    if($('#total-reviews')) $('#total-reviews').textContent = `${total} nhận xét`;
    if($('#avg-stars')) $('#avg-stars').innerHTML = renderStars(Math.round(avg));
}

// Hàm vẽ sao vàng (Sử dụng FontAwesome)
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fa-solid fa-star"></i>'; // Sao đặc
        } else {
            stars += '<i class="fa-regular fa-star" style="color: #cbd5e1;"></i>'; // Sao rỗng
        }
    }
    return stars;
}


// --- 8. KHỞI CHẠY ---
document.addEventListener('DOMContentLoaded', () => {
    const qtyInput = $('.qty-input');
    $('.qty-increase')?.addEventListener('click', () => { qtyInput.value = parseInt(qtyInput.value) + 1; });
    $('.qty-decrease')?.addEventListener('click', () => { if(qtyInput.value > 1) qtyInput.value = parseInt(qtyInput.value) - 1; });
    loadProductDetail();
    loadReviews(); 
});