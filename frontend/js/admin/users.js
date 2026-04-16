import { api } from './api.js';


// Load người dùng
export async function loadUsers() {
  const tbody = document.getElementById('adminUsersTable');
  if (!tbody) return;

  const users = await api('/api/auth/users');
  const sortedUsers = (users || []).sort((a, b) => b.isAdmin - a.isAdmin);

  tbody.innerHTML = sortedUsers.map(u => {
    const roleBadge = u.isAdmin 
      ? `<span class="badge" style="background: #6366f1; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Admin</span>`
      : `<span class="badge" style="background: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 11px;">User</span>`;

    const lockStatus = u.isActive === false ? ' <span style="color:red; font-size:11px;">[ĐÃ KHÓA]</span>' : '';

    // --- BƯỚC XỬ LÝ NGÀY THÁNG ---
    const dateCreated = u.createdAt 
      ? new Date(u.createdAt).toLocaleDateString('vi-VN') // Trả về định dạng DD/MM/YYYY
      : '---';

    return `
      <tr>
        <td>
          <div style="display: flex; flex-direction: column;">
            <b class="user-name">${u.name || 'N/A'}${lockStatus}</b>
            <small style="color: #6b7280;">${u.email}</small>
          </div>
        </td>
        <td><small>${u.phone || '---'}</small></td>
        <td>
            <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px;" title="${u.address || ''}">
                ${u.address || '---'}
            </div>
        </td>
        <td>${roleBadge}</td>
        
        <!-- THÊM CỘT NGÀY TẠO Ở ĐÂY -->
        <td><small style="color: #64748b;">${dateCreated}</small></td>

        <td>
          <div class="action-buttons" style="display: flex; gap: 8px;">
            ${u.isRoot ? '<small style="color:#94a3b8; font-style:italic">Tài khoản hệ thống</small>' : `
              <button class="edit-user" 
                      data-id="${u._id}" 
                      data-name="${u.name || ''}" 
                      data-email="${u.email}"
                      data-phone="${u.phone || ''}"
                      data-address="${u.address || ''}"
                      data-active="${u.isActive}"
                      style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Sửa</button>
              
              <button class="${u.isAdmin ? 'demote' : 'promote'}" 
                      data-id="${u._id}" 
                      style="background: ${u.isAdmin ? '#6b7280' : '#10b981'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                ${u.isAdmin ? 'Hạ cấp' : 'Thăng cấp'}
              </button>

              <button class="delete-user" data-id="${u._id}" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Xóa</button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  attachUserEvents();
}

// Sửa người dùng
function attachUserEvents() {
  const tbody = document.getElementById('adminUsersTable');
  const userModal = document.getElementById('userFormWrapper');

  // 1. Thăng cấp
  tbody.querySelectorAll('.promote').forEach(btn => {
    btn.onclick = async () => {
      if (confirm(`Nâng cấp người dùng này lên Admin?`)) {
        await api(`/api/auth/users/${btn.dataset.id}/promote`, { method: 'POST' });
        loadUsers();
      }
    };
  });

  // 2. Hạ cấp
  tbody.querySelectorAll('.demote').forEach(btn => {
    btn.onclick = async () => {
      if (confirm(`Hạ cấp Admin này xuống người dùng thường?`)) {
        const res = await api(`/api/auth/users/${btn.dataset.id}/demote`, { method: 'POST' });
        if(res.error) alert(res.error);
        loadUsers();
      }
    };
  });

  // 3. Mở Modal Sửa (Điền sẵn dữ liệu và Checkbox)
 tbody.querySelectorAll('.edit-user').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('editUserId').value = btn.dataset.id;
      document.getElementById('editUserName').value = btn.dataset.name;
      document.getElementById('editUserEmail').value = btn.dataset.email;
      
      // THÊM: Gán SĐT và Địa chỉ vào ô nhập liệu
      if(document.getElementById('editUserPhone')) document.getElementById('editUserPhone').value = btn.dataset.phone;
      if(document.getElementById('editUserAddress')) document.getElementById('editUserAddress').value = btn.dataset.address;

      document.getElementById('editUserActive').checked = (btn.dataset.active === 'true');
      userModal.style.display = 'flex';
    };
  });

  // 4. Xóa
  tbody.querySelectorAll('.delete-user').forEach(btn => {
    btn.onclick = async () => {
      if (confirm(`Xóa vĩnh viễn người dùng này?`)) {
        await api(`/api/auth/users/${btn.dataset.id}`, { method: 'DELETE' });
        loadUsers();
      }
    };
  });
}

// Gán sự kiện submit form (CHỈ GÁN 1 LẦN)
if (!window.isUserEventBound) {
  document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value;
    const isActive = document.getElementById('editUserActive').checked;

    const res = await api(`/api/auth/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, isActive })
    });

    if (!res.error) {
      alert('Đã cập nhật thông tin!');
      document.getElementById('userFormWrapper').style.display = 'none';
      loadUsers();
    } else {
      alert('Lỗi: ' + res.error);
    }
  });

  // Đóng modal
  const closeBtns = ['btnCloseUserX', 'btnCancelUser'];
  closeBtns.forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('userFormWrapper').style.display = 'none';
    });
  });

  window.isUserEventBound = true; // Cờ chặn gán trùng sự kiện
}