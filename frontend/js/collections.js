    // js/collections.js
    const $ = selector => document.querySelector(selector);

    function formatCurrency(v) {
        return (v || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
    }

   // --- 1. HÀM LOAD SẢN PHẨM ---
async function loadProductList() {
    const productGrid = $('#products');
    if (!productGrid) return;

    // SỬA Ở ĐÂY: Thêm kiểm tra tồn tại trước khi lấy .value
    const genderInput = document.querySelector('input[name="genderFilter"]:checked');
    const selectedGender = genderInput ? genderInput.value : ''; 

    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('category');

    let apiUrl = '/api/products';
    let queryParts = [];
    
    // Nếu có gender từ radio hoặc từ URL
    if (selectedGender) queryParts.push(`gender=${selectedGender}`);
    if (categoryId) queryParts.push(`category=${categoryId}`);
    if (queryParts.length > 0) apiUrl += '?' + queryParts.join('&');

    try {
        const [prodRes, revRes] = await Promise.all([
            fetch(apiUrl),
            fetch('/api/reviews')
        ]);

        const products = await prodRes.json();
        const reviews = await revRes.json() || [];

        if (!products || products.length === 0) {
            productGrid.innerHTML = '<p style="text-align:center; width:100%; padding: 50px 0;">Không tìm thấy sản phẩm nào.</p>';
            return;
        }

        productGrid.innerHTML = products.map(p => {
            const hasDiscount = p.discount && p.discount > 0;
            const finalPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : p.price;

            const prodReviews = reviews.filter(r => (r.product?._id || r.product) === p._id);
            const avgRating = prodReviews.length > 0 
                ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length) 
                : 0;

            return `
                <div class="product-card" onclick="location.href='product.html?id=${p._id}'">
                    <div class="product-img">
                        <img src="${p.image || 'img/default.jpg'}">
                        ${hasDiscount ? `<span class="discount-badge">Giảm giá ${p.discount}%</span>` : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${p.title}</h3>
                        <div class="product-rating-home" style="margin-bottom: 6px; font-size: 11px; color: #f59e0b; display: flex; align-items: center;">
                            ${avgRating > 0 
                                ? renderStarsCollections(Math.round(avgRating)) + ` <span style="color: #94a3b8; margin-left:4px;">(${prodReviews.length})</span>` 
                                : '<span style="color: #cbd5e1;">Chưa có đánh giá</span>'}
                        </div>
                        <div class="product-price-wrapper">
                            <span class="product-price">${formatCurrency(finalPrice)}</span>
                            ${hasDiscount ? `<span class="old-price">${formatCurrency(p.price)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        renderCollectionsBreadcrumb(selectedGender, categoryId);
    } catch (err) {
        console.error("Lỗi tải sản phẩm:", err);
        productGrid.innerHTML = '<p>Lỗi tải dữ liệu.</p>';
    }
}

    // 2. HÀM PHỤ ĐỂ VẼ SAO (Thêm vào trong file collections.js)
    function renderStarsCollections(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= rating 
                ? '<i class="fa-solid fa-star"></i>' 
                : '<i class="fa-regular fa-star" style="color: #cbd5e1;"></i>';
        }
        return stars;
    }


    // --- 2. HÀM LOAD SIDEBAR ---
    async function loadSidebarCategories() {
        const sidebarContainer = document.getElementById('category-sidebar-content');
        if (!sidebarContainer) return;

        const selectedGender = document.querySelector('input[name="genderFilter"]:checked').value || 'male';

        try {
            const res = await fetch('/api/categories');
            const categories = await res.json();

            const parents = categories.filter(c => 
                (!c.parent || c.parent === "" || c.parent === "null") && 
                (c.gender === selectedGender || c.gender === 'unisex')
            );

            sidebarContainer.innerHTML = parents.map(parent => {
                const children = categories.filter(c => c.parent === parent._id);
                return `
                    <div class="category-block">
                        <h4 class="category-title">${parent.name}</h4>
                        <ul class="category-list">
                            ${children.map(child => `<li><a href="collections.html?category=${child._id}">${child.name}</a></li>`).join('')}
                            <li><a href="collections.html?category=${parent._id}" class="view-all">Tất cả</a></li>
                        </ul>
                    </div>
                `;
            }).join('');
        } catch (err) {
            sidebarContainer.innerHTML = "Lỗi tải danh mục.";
        }
    }

    // --- 3. BREADCRUMB ---
    async function renderCollectionsBreadcrumb(gender, categoryId) {
        const breadContainer = $('#breadcrumb');
        if (!breadContainer) return;
        const genderNames = { 'male': 'Nam', 'female': 'Nữ' };
        let html = `<a href="index.html">Trang chủ</a> / `;
        html += gender ? `<span>${genderNames[gender]}</span>` : `<span>Tất cả sản phẩm</span>`;
        breadContainer.innerHTML = html;
    }

    // --- KHỞI CHẠY ---
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Kiểm tra URL xem đang chọn giới tính nào để "tích" sẵn radio đó
        const params = new URLSearchParams(window.location.search);
        const genderParam = params.get('gender');
        if (genderParam) {
            const targetRadio = document.querySelector(`input[name="genderFilter"][value="${genderParam}"]`);
            if (targetRadio) targetRadio.checked = true;
        }

        // 2. Lắng nghe sự kiện THAY ĐỔI của các radio
        document.querySelectorAll('input[name="genderFilter"]').forEach(radio => {
            radio.addEventListener('change', () => {
                loadProductList();
                loadSidebarCategories();
                
                // Cập nhật URL mà không load lại trang để khách copy link được
                const newUrl = new URL(window.location);
                if (radio.value) newUrl.searchParams.set('gender', radio.value);
                else newUrl.searchParams.delete('gender');
                window.history.pushState({}, '', newUrl);
            });
        });

        // 3. Chạy lần đầu
        loadSidebarCategories();
        loadProductList();
    });