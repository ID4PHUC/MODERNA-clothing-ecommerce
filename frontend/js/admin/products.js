    // js/admin/products.js
    import { api } from './api.js';
    import { getImageUrl } from './utils.js'; 

    // --- BIẾN TOÀN CỤC QUẢN LÝ ẢNH ---
    let allImages = []; // Danh sách: { src: 'url_blob', file: FileObject_hoac_null, isExisting: true/false }
    let mainIndex = 0;

    // 1. Lắng nghe chọn file mới
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                allImages.push({
                    src: URL.createObjectURL(file), // Tạo link tạm để xem ảnh
                    file: file,
                    isExisting: false
                });
            });
            renderPreviews();
        });
    }

    // 2. Hàm vẽ danh sách ảnh lên màn hình
    function renderPreviews() {
        const container = document.getElementById('imagePreviewContainer');
        const statusText = document.getElementById('fileCountStatus');
        if (!container) return;

        container.innerHTML = '';
        statusText.innerText = allImages.length > 0 ? `Đã chọn ${allImages.length} ảnh` : "Chưa có ảnh nào";

        allImages.forEach((imgObj, index) => {
            const div = document.createElement('div');
            div.className = `preview-item ${index === mainIndex ? 'is-main' : ''}`;
            div.style = `position: relative; width: 100px; height: 100px; border: 2px solid ${index === mainIndex ? '#6366f1' : '#eee'}; border-radius: 8px; overflow: hidden;`;

            div.innerHTML = `
                <img src="${imgObj.src}" style="width:100%; height:100%; object-fit:cover;">
                <span onclick="removeImage(${index})" style="position:absolute; top:2px; right:2px; background:red; color:white; border-radius:50%; width:18px; height:18px; text-align:center; font-size:12px; cursor:pointer; line-height:16px;">×</span>
                <div onclick="setMainImage(${index})" style="position:absolute; bottom:0; width:100%; background:${index === mainIndex ? '#6366f1' : 'rgba(0,0,0,0.5)'}; color:white; font-size:10px; text-align:center; padding:3px 0; cursor:pointer;">
                    ${index === mainIndex ? '★ Ảnh chính' : 'Đặt làm chính'}
                </div>
            `;
            container.appendChild(div);
        });
        
        // Cập nhật giá trị index ảnh chính vào input ẩn
        document.getElementById('mainImageIndex').value = mainIndex;
    }

    // 3. Hàm đặt ảnh làm chính
    window.setMainImage = (index) => {
        mainIndex = index;
        renderPreviews();
    };

    // 4. Hàm xóa ảnh
    window.removeImage = (index) => {
        allImages.splice(index, 1);
        if (mainIndex >= allImages.length) mainIndex = 0;
        renderPreviews();
    };

    // 5. KHI MỞ FORM SỬA 
    export function fillProductVariants(p) {
    // 1. Reset tất cả checkbox về trống
    document.querySelectorAll('input[name="sizes"], input[name="colors"]').forEach(cb => cb.checked = false);

    // 2. Tích chọn Size & Màu 
    if (p.sizes && Array.isArray(p.sizes)) {
        p.sizes.forEach(s => {
            const cb = document.querySelector(`input[name="sizes"][value="${s}"]`);
            if (cb) cb.checked = true;
        });
    }
    if (p.colors && Array.isArray(p.colors)) {
        p.colors.forEach(c => {
            const cb = document.querySelector(`input[name="colors"][value="${c}"]`);
            if (cb) cb.checked = true;
        });
    }

    // 3. HIỂN THỊ LẠI ẢNH CŨ LÊN VÙNG PREVIEW
    const existingImages = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
    
    // Nạp link ảnh vào mảng quản lý để có thể Xóa/Thêm/Đặt ảnh chính
    allImages = existingImages.map(url => ({
        src: url,
        file: null,
        isExisting: true
    }));

    // Tìm xem tấm nào đang là ảnh chính để hiện ngôi sao ★
    mainIndex = existingImages.indexOf(p.image);
    if (mainIndex === -1) mainIndex = 0;

    // Vẽ lại giao diện preview ảnh
    renderPreviews(); 
    }
    
// 6. KHI GỬI FORM (Submit) logic gửi API)
const productForm = document.getElementById('addProductForm');
if (productForm) {
    productForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = productForm.dataset.editId;
        const formData = new FormData(productForm);
        
        // --- XỬ LÝ ẢNH ---
        formData.delete('images'); // Xóa rác
        let hasNewFile = false;
        
        allImages.forEach(imgObj => {
            if (imgObj.file) {
                formData.append('images', imgObj.file); // Gửi file thật lên Cloudinary
                hasNewFile = true;
            }
        });

        // Gửi mảng link ảnh cũ nếu đang ở chế độ Sửa
        const keepOldImages = allImages.filter(i => i.isExisting).map(i => i.src);
        formData.append('existingImages', JSON.stringify(keepOldImages));
        formData.append('mainImageIndex', mainIndex);

        // --- CHUẨN HÓA GIÁ TIỀN ---
        const rawPrice = formData.get('price').toString().replace(/\D/g, '');
        formData.set('price', rawPrice);

        try {
            const url = id ? `/api/products/${id}` : '/api/products';
            const response = await fetch(url, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: formData 
            });

            const result = await response.json();

            if (response.ok) {
                alert(id ? 'Cập nhật thành công!' : 'Thêm sản phẩm thành công!');
                // Đóng modal (giả sử ông dùng formWrapper ở file admin.js)
                document.getElementById('productFormWrapper').style.display = 'none';
                loadProducts(window.openEditProductForm); // Load lại bảng
            } else {
                alert('Lỗi: ' + (result.error || result.message));
            }
        } catch (err) { 
            console.error('Lỗi submit:', err);
            alert('Lỗi kết nối Server!');
        }
    };
}
    export async function loadProducts(openEditForm) {
        const tbody = document.getElementById('adminProductsTable');
        if (!tbody) return;

        const [products, categories] = await Promise.all([
            api('/api/products'),
            api('/api/categories')
        ]);

        if (!products || products.error) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không thể tải dữ liệu.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const imageCount = p.images ? p.images.length : (p.image ? 1 : 0);
            const catObj = categories.find(c => c._id === p.category);
            const subCatObj = categories.find(c => c._id === p.subCategory);
            
            return `
                <tr>
                    <td>
                        <div class="table-img-container" style="position: relative; width: 60px; height: 60px;">
                            <!--<img src="${p.image || 'https://via.placeholder.com/60'}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">-->
                            <img src="${getImageUrl(p.image)}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
                            ${imageCount > 1 ? `<span class="img-badge" style="position:absolute;bottom:-5px;right:-5px;background:#6366f1;color:white;font-size:10px;padding:2px 6px;border-radius:10px;">${imageCount}</span>` : ''}
                        </div>
                    </td>
                    <td style="font-weight: 500;">${p.title}</td>
                    <td style="color: #ef4444; font-weight: 600;">${p.price?.toLocaleString()} đ</td>
                    <td style="color: #ef4444; font-weight: bold;">${p.discount > 0 ? '-' + p.discount + '%' : '0%'}</td>
                    <td><span style="text-transform: capitalize;">${p.gender || 'unisex'}</span></td>
                    <td><span class="badge-cat" style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${catObj ? catObj.name : 'N/A'}</span></td>
                    <td>${subCatObj ? subCatObj.name : 'N/A'}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="edit" data-id="${p._id}" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Sửa</button>
                            <button class="delete" data-id="${p._id}" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Xóa</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        // Sự kiện Xóa
        tbody.querySelectorAll('.delete').forEach(btn => {
            btn.onclick = async () => {
                if (confirm(`Xóa sản phẩm này?`)) {
                    await api('/api/products/' + btn.dataset.id, { method: 'DELETE' });
                    loadProducts(openEditForm);
                }
            };
        });

        // Sự kiện Sửa
        tbody.querySelectorAll('.edit').forEach(btn => {
            btn.onclick = async () => {
                const p = await api('/api/products/' + btn.dataset.id);
                if (p && !p.error) {
                    // Gọi hàm điền thông tin và tích checkbox
                    openEditForm(p); 
                    fillProductVariants(p); // Gọi hàm tích checkbox mới thêm ở trên
                }
            };
        });
    }