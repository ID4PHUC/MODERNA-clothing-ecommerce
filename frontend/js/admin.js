// js/admin.js
import { api } from './admin/api.js';
import { loadProducts, fillProductVariants } from './admin/products.js';
import { loadUsers } from './admin/users.js';
import { loadOrders } from './admin/orders.js';
import { loadCategories } from './admin/categories.js';
import { loadReviews } from './admin/reviews.js'; 
import { formatVND } from './admin/utils.js';
import { loadDashboardData } from './admin/dashboard.js';
 


// =========================================================================
// 0. HÀM XỬ LÝ BIẾN THỂ TỰ NHẬP (SIZE & MÀU)
// =========================================================================

// Hàm này để render ra các tag biến thể (dùng chung cho cả lúc nhấn nút Thêm và lúc Load form Sửa)
function renderCustomTag(type, value) {
    const wrapperId = type === 'size' ? 'sizeWrapper' : 'colorWrapper';
    const nameAttr = type === 'size' ? 'sizes' : 'colors';
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const label = document.createElement('label');
    label.className = 'variant-label custom-tag';
    label.style = "background:#eef2ff; padding:2px 8px; border-radius:4px; display:flex; align-items:center; gap:5px; border:1px solid #c7d2fe; margin-bottom:5px;";

    label.innerHTML = `
        <input type="checkbox" name="${nameAttr}" value="${value}" checked> 
        ${value}
        <span onclick="this.parentElement.remove()" style="cursor:pointer; color:#ef4444; font-weight:bold; margin-left:5px">&times;</span>
    `;
    wrapper.appendChild(label);
}

// Hàm được gọi trực tiếp từ nút bấm trong HTML (onclick="addCustomVariant('size')")
window.addCustomVariant = function(type) {
    const inputId = type === 'size' ? 'inputCustomSize' : 'inputCustomColor';
    const input = document.getElementById(inputId);
    const value = input?.value.trim();

    if (!value) return;

    // Kiểm tra xem giá trị này đã tồn tại trong mảng checkbox/tag chưa
    const nameAttr = type === 'size' ? 'sizes' : 'colors';
    const existing = Array.from(document.querySelectorAll(`input[name="${nameAttr}"]`))
                          .some(i => i.value.toLowerCase() === value.toLowerCase());
    
    if (existing) {
        alert("Giá trị này đã tồn tại!");
        return;
    }

    renderCustomTag(type, value);
    input.value = '';
    input.focus();
};


// =========================================================================
// CHÍNH: KHI TRANG LOAD XONG
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. BIẾN TOÀN CỤC & DOM ELEMENTS
    // =========================================================================
    let cachedCategories = [];
    const addForm = document.getElementById('addProductForm');
    const imageInput = document.getElementById('imageFile');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const formWrapper = document.getElementById('productFormWrapper');
    const btnShowAdd = document.getElementById('btnShowAdd');
    const btnCancel = document.getElementById('btnCancel');
    const btnCloseX = document.getElementById('btnCloseX');
    const formTitle = document.getElementById('formTitle');
    const categorySelect = document.getElementById('category');
    const subCategorySelect = document.getElementById('subCategory');
    const genderSelect = document.getElementById('gender');
    const priceInput = document.getElementById('price');
    const catForm = document.getElementById('addCategoryForm');
    const catModal = document.getElementById('categoryFormWrapper');
    const btnShowAddCat = document.getElementById('btnShowAddCat');
    const btnCancelCat = document.getElementById('btnCancelCat');
    const btnCloseCatX = document.getElementById('btnCloseCatX');
    const parentCategorySelect = document.getElementById('parentCategorySelect');

    // =========================================================================
    // 2. LOGIC GIAO DIỆN CHUNG (TABS, SEARCH)
    // =========================================================================

    document.querySelectorAll('.menu li').forEach(tab => {
        tab.onclick = () => {
            const target = tab.dataset.tab;

            document.querySelectorAll('.menu li, .tab-content').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target)?.classList.add('active');

            // Gọi hàm load dữ liệu tương ứng với từng Tab
            if (target === 'dashboard') loadDashboardData(); 
            if (target === 'products') loadProducts(openEditProductForm);
            if (target === 'users') loadUsers();
            if (target === 'orders') loadOrders();
            if (target === 'categories') loadCategories();
            if (target === 'reports') loadReviews()
        };
    });

    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('table-search')) {
            const keyword = e.target.value.toLowerCase();
            const activeTab = e.target.closest('.tab-content');
            const rows = activeTab.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(keyword) ? '' : 'none';
            });
        }
    });

    // =========================================================================
    // 3. XỬ LÝ DANH MỤC ĐỘNG
    // =========================================================================

    async function refreshCategoryDropdowns() {
        try {
            const res = await api('/api/categories');
            if (res && !res.error) {
                cachedCategories = res;
                const selectedGender = genderSelect.value;
                const parents = cachedCategories.filter(c => 
                    (!c.parent || c.parent === "null") && 
                    (c.gender === selectedGender || c.gender === 'unisex')
                );
                categorySelect.innerHTML = parents.length > 0 
                    ? '<option value="">Chọn loại</option>' + parents.map(c => `<option value="${c._id}">${c.name}</option>`).join('')
                    : '<option value="">(Không có danh mục)</option>';
                subCategorySelect.innerHTML = '<option value="">Chọn loại chính trước</option>';
            }
        } catch (err) { console.error("Lỗi tải danh mục:", err); }
    }

    genderSelect?.addEventListener('change', refreshCategoryDropdowns);
    categorySelect?.addEventListener('change', () => {
        const parentId = categorySelect.value;
        const selectedGender = genderSelect.value;
        const children = cachedCategories.filter(c => c.parent === parentId && (c.gender === selectedGender || c.gender === 'unisex'));
        subCategorySelect.innerHTML = children.length > 0
            ? '<option value="">Chọn chi tiết</option>' + children.map(c => `<option value="${c._id}">${c.name}</option>`).join('')
            : '<option value="">(Không có chi tiết phù hợp)</option>';
    });

    // =========================================================================
    // 4. LOGIC SẢN PHẨM (ẢNH & GIÁ)
    // =========================================================================

    priceInput?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        e.target.value = value ? Number(value).toLocaleString('vi-VN') : "";
    });

    imageInput?.addEventListener('change', function() {
        if (!imagePreviewContainer) return;
        imagePreviewContainer.innerHTML = ''; 
        Array.from(this.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `<img src="${e.target.result}"><span class="remove-img">&times;</span>`;
                imagePreviewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });

    imagePreviewContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-img')) e.target.parentElement.remove();
    });

    // =========================================================================
    // 5. QUẢN LÝ MODALS (ĐÓNG/MỞ FORM)
    // =========================================================================

    function closeAllModals() {
        formWrapper.style.display = 'none';
        if (catModal) catModal.style.display = 'none';
    }

    async function openAddProductForm() {
        await refreshCategoryDropdowns(); 
        formTitle.innerText = 'Thêm sản phẩm mới';
        addForm.reset();
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
        delete addForm.dataset.editId;
        
        // Reset checkbox và xóa sạch các tag nhập tay cũ
        document.querySelectorAll('input[name="sizes"], input[name="colors"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.custom-tag').forEach(el => el.remove());
        
        addForm.querySelector('button[type="submit"]').textContent = 'Thêm sản phẩm';
        formWrapper.style.display = 'flex';
    }

    async function openEditProductForm(p) {
        await refreshCategoryDropdowns(); 
        formTitle.innerText = 'Cập nhật sản phẩm';
        addForm.dataset.editId = p._id;
        addForm.title.value = p.title;
        addForm.price.value = Number(p.price).toLocaleString('vi-VN');
        addForm.description.value = p.description || '';
        addForm.gender.value = p.gender;

        categorySelect.value = p.category;
        const children = cachedCategories.filter(c => c.parent === p.category);
        subCategorySelect.innerHTML = '<option value="">Chọn chi tiết</option>' + 
            children.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
        subCategorySelect.value = p.subCategory;

        // --- Xử lý Biến thể (Size & Màu) khi Sửa ---
        // 1. Reset trạng thái cũ
        document.querySelectorAll('input[name="sizes"], input[name="colors"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.custom-tag').forEach(el => el.remove());

        // 2. Load lại Size
        if (p.sizes && p.sizes.length > 0) {
            p.sizes.forEach(s => {
                const cb = document.querySelector(`input[name="sizes"][value="${s}"]`);
                if (cb) cb.checked = true;
                else renderCustomTag('size', s); // Nếu là size lạ, tự tạo tag
            });
        }

        // 3. Load lại Màu
        if (p.colors && p.colors.length > 0) {
            p.colors.forEach(c => {
                const cb = document.querySelector(`input[name="colors"][value="${c}"]`);
                if (cb) cb.checked = true;
                else renderCustomTag('color', c); // Nếu là màu lạ, tự tạo tag
            });
        }

        if (imagePreviewContainer) {
            imagePreviewContainer.innerHTML = '';
            const imgs = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
            imgs.forEach(imgUrl => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `<img src="${imgUrl}"><span class="remove-img">&times;</span>`;
                imagePreviewContainer.appendChild(div);
            });
        }
        addForm.querySelector('button[type="submit"]').textContent = 'Cập nhật sản phẩm';
        formWrapper.style.display = 'flex';
    }

    btnShowAdd?.addEventListener('click', openAddProductForm);
    [btnCancel, btnCloseX, btnCancelCat, btnCloseCatX].forEach(btn => btn?.addEventListener('click', closeAllModals));

    // =========================================================================
    // 6. SUBMIT DỮ LIỆU SẢN PHẨM
    // =========================================================================

    addForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const id = addForm.dataset.editId;
        const fd = new FormData(addForm);

        // A. Xử lý ảnh cũ còn lại
        if (id) {
            const remainingImages = Array.from(imagePreviewContainer.querySelectorAll('img'))
                                         .map(img => img.getAttribute('src'))
                                         .filter(src => src && src.startsWith('/uploads/'));
            fd.delete('existingImages'); 
            remainingImages.forEach(url => fd.append('existingImages', url));
        }

        // B. Xử lý Size & Màu (Gộp cả checkbox mặc định và tag tự nhập)
        const selectedSizes = Array.from(addForm.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);
        const selectedColors = Array.from(addForm.querySelectorAll('input[name="colors"]:checked')).map(cb => cb.value);

        fd.delete('sizes');
        fd.delete('colors');
        selectedSizes.forEach(s => fd.append('sizes', s));
        selectedColors.forEach(c => fd.append('colors', c));

        // C. Xử lý giá tiền
        const rawPrice = fd.get('price').toString().replace(/\./g, ''); 
        fd.set('price', rawPrice);

        try {
            const url = id ? `/api/products/${id}` : '/api/products';
            const response = await fetch(url, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: fd 
            });

            if (response.ok) {
                alert(id ? 'Cập nhật thành công!' : 'Thêm thành công!');
                closeAllModals();
                loadProducts(openEditProductForm);
            } else {
                const err = await response.json();
                alert('Lỗi: ' + err.error);
            }
        } catch (err) { console.error('Lỗi submit:', err); }
    });

    // =========================================================================
    // 7. QUẢN LÝ DANH MỤC & KHỞI CHẠY
    // =========================================================================
    btnShowAddCat?.addEventListener('click', async () => { 
        try {
            const res = await api('/api/categories');
            if (res && !res.error) {
                const parents = res.filter(c => !c.parent || c.parent === "null" || c.parent === "");
                if (parentCategorySelect) parentCategorySelect.innerHTML = '<option value="">-- Là danh mục chính --</option>' + parents.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
            }
        } catch (err) { console.error(err); }
        catModal.style.display = 'flex'; 
    });

    catForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(catForm);
        const parentVal = formData.get('parent')?.trim();
        const data = { name: formData.get('name').trim(), gender: formData.get('gender'), parent: (!parentVal || parentVal === "null") ? null : parentVal };

        const res = await api('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.error) {
            alert('Đã thêm danh mục!');
            closeAllModals(); catForm.reset(); loadCategories(); await refreshCategoryDropdowns();
        } else alert('Lỗi: ' + res.error);
    });

    loadProducts(openEditProductForm);
    loadDashboardData();
});

// --- XỬ LÝ CHUYỂN TAB TRONG MỤC REPORTS ---
document.querySelectorAll('.sub-report-btn').forEach(btn => {
    btn.onclick = () => {
        const targetId = btn.dataset.sub;

        // 1. Đổi màu chữ nút được chọn
        document.querySelectorAll('.sub-report-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Ẩn/Hiện nội dung tương ứng
        document.querySelectorAll('.sub-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(targetId).style.display = 'block';

        // 3. Load dữ liệu nếu là tab AI Chat
        if (targetId === 'sub-ai-chat') {
            loadAiChatHistory();
        } else {
            loadReviews(); // Hàm có sẵn của bạn
        }
    };
});

// --- HÀM LOAD LỊCH SỬ CHAT AI ---
// Hàm load lịch sử chat AI lên bảng Admin
async function loadAiChatHistory() {
    const tbody = document.getElementById('adminAiChatTable');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải dữ liệu...</td></tr>';
        const res = await fetch('/api/chat/history');
        const history = await res.json();

        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có lịch sử trò chuyện.</td></tr>';
            return;
        }

        // Đảo ngược mảng để cái mới nhất hiện lên trên đầu
        tbody.innerHTML = history.reverse().map(item => `
            <tr>
                <td><small>${new Date(item.createdAt).toLocaleString('vi-VN')}</small></td>
                <td style="color: #4338ca; font-weight: 500;">${item.message}</td>
                <td style="color: #059669; font-style: italic;">${item.reply}</td>
                <td>
                    <button class="btn-delete-chat" data-id="${item._id}" 
                            style="color:red; background:none; border:1px solid red; padding:4px 8px; border-radius:4px; cursor:pointer;">
                        Xóa
                    </button>
                </td>
            </tr>
        `).join('');

        // Gán sự kiện xóa cho các nút
        tbody.querySelectorAll('.btn-delete-chat').forEach(btn => {
            btn.onclick = async () => {
                const chatId = btn.dataset.id;
                if (confirm('Bạn có chắc chắn muốn xóa dòng chat này không?')) {
                    try {
                        const deleteRes = await fetch(`/api/chat/history/${chatId}`, { method: 'DELETE' });
                        const result = await deleteRes.json();
                        if (deleteRes.ok) {
                            alert('Đã xóa thành công!');
                            loadAiChatHistory(); // Load lại bảng ngay lập tức
                        } else {
                            alert('Lỗi: ' + result.error);
                        }
                    } catch (err) {
                        alert('Không thể kết nối server để xóa.');
                    }
                }
            };
        });

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Lỗi tải dữ liệu chat.</td></tr>';
    }
}

