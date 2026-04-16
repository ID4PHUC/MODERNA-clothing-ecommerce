// js/admin/dashboard.js
import { api } from './api.js';

export async function loadDashboardData() {
    try {
        // 1. Gọi tất cả dữ liệu cùng lúc để tối ưu tốc độ
        const [products, orders, users] = await Promise.all([
            api('/api/products'),
            api('/api/orders/all'),
            api('/api/auth/users')
        ]);

        // 2. Cập nhật các con số thống kê nhanh
        document.getElementById('statProducts').innerText = products.length || 0;
        document.getElementById('statUsers').innerText = users.length || 0;
        document.getElementById('statOrders').innerText = orders.length || 0;

        //console.log("Danh sách user nhận được:", users);
        //Nếu backend trả về { users: [...] } thay vì [...] thì phải sửa thành users.users.length
        const userCount = Array.isArray(users) ? users.length : (users.users?.length || 0);
        document.getElementById('statUsers').innerText = userCount;

        // Tính doanh thu (Chỉ tính những đơn hàng đã giao thành công hoặc đã thanh toán)
        const totalRevenue = orders
            .filter(o => o.status === 'delivered' || o.paymentStatus === 'paid')
            .reduce((sum, order) => sum + (order.total || 0), 0);
        
        document.getElementById('statRevenue').innerText = totalRevenue.toLocaleString('vi-VN') + ' đ';

        // 3. Hiển thị danh sách đơn hàng mới nhất (Lấy 5 đơn gần nhất)
        renderRecentOrders(orders.slice(0, 5));

        // 4. Vẽ biểu đồ doanh thu 7 ngày qua
        renderRevenueChart(orders);

    } catch (err) {
        console.error("Lỗi tải dữ liệu Dashboard:", err);
    }
}

function renderRecentOrders(recentOrders) {
    const list = document.getElementById('recentOrdersList');
    if (!list) return;

    if (recentOrders.length === 0) {
        list.innerHTML = '<p style="color:#999; text-align:center">Chưa có đơn hàng nào.</p>';
        return;
    }

    list.innerHTML = recentOrders.map(o => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f8fafc;">
            <div>
                <strong style="font-size: 14px;">#${o._id.slice(-6).toUpperCase()}</strong>
                <div style="font-size: 12px; color: #64748b;">${o.address?.name || 'Khách hàng'}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; font-size: 14px;">${o.total.toLocaleString()}đ</div>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px;" class="status-${o.status}">${o.status}</span>
            </div>
        </li>
    `).join('');
}

function renderRevenueChart(orders) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Logic xử lý dữ liệu theo ngày (tối giản)
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }).reverse();

    // Tính tổng tiền theo từng ngày trong last7Days
    const dailyData = last7Days.map(dateLabel => {
        return orders
            .filter(o => {
                const orderDate = new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                return orderDate === dateLabel && (o.status === 'delivered' || o.paymentStatus === 'paid');
            })
            .reduce((sum, o) => sum + o.total, 0);
    });

    // Hủy biểu đồ cũ nếu có để vẽ lại
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: dailyData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}