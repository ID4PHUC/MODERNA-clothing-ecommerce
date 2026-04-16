import { api } from './api.js';

export async function loadCategories() {
  const tbody = document.getElementById('adminCategoriesTable');
  if (!tbody) return;

  const categories = await api('/api/categories');
  if (!categories || categories.error) return;

  tbody.innerHTML = categories.map(c => {
    // 1. Tìm tên danh mục cha
    const parentCat = categories.find(p => p._id === c.parent);
    const parentName = parentCat 
      ? `<b>${parentCat.name}</b>` 
      : '<span style="color:gray">Danh mục chính</span>';

    // 2. Chuyển đổi mã giới tính sang tiếng Việt cho dễ đọc
    const genderMap = {
      'male': 'Nam',
      'female': 'Nữ',
      'unisex': 'Cả hai'
    };
    const genderName = genderMap[c.gender] || 'Cả hai';

    // ĐỔ RA ĐÚNG 5 CỘT (TD) THEO THỨ TỰ TRONG THEAD
    return `
      <tr>
        <td>${c._id.slice(-5)}</td>
        <td><b>${c.name}</b></td>
        <td><span class="badge-gender">${genderName}</span></td>
        <td>${parentName}</td>
        <td>
          <button class="delete-cat" data-id="${c._id}" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Xóa</button>
        </td>
      </tr>
    `;
  }).join('');

  // Gán sự kiện xóa
  tbody.querySelectorAll('.delete-cat').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Xóa danh mục này sẽ ảnh hưởng đến hiển thị sản phẩm?')) {
        const res = await api(`/api/categories/${btn.dataset.id}`, { method: 'DELETE' });
        if (!res.error) loadCategories();
      }
    };
  });
}