// js/admin/ui.js
export function setupTabs(loadProducts, loadUsers, loadOrders) {
    document.querySelectorAll('.menu li').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.menu li, .tab-content').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab)?.classList.add('active');

            if (tab.dataset.tab === 'products') loadProducts();
            if (tab.dataset.tab === 'users') loadUsers();
            if (tab.dataset.tab === 'orders') loadOrders();
        };
    });
}