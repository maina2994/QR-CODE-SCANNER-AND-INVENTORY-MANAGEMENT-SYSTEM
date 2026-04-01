const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

document.getElementById('menu-mgmt').addEventListener('click', loadMenuMgmt);
document.getElementById('inventory-mgmt').addEventListener('click', loadInventoryMgmt);
document.getElementById('orders-mgmt').addEventListener('click', loadOrdersMgmt);

function loadMenuMgmt() {
    fetch('/menu-admin', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const content = document.getElementById('content');
        content.innerHTML = '<h2>Menu Management</h2>' +
            data.map(item => `
                <div>
                    <span>${item.name} - $${item.price}</span>
                    <button onclick="editItem(${item.id})">Edit</button>
                    <button onclick="deleteItem(${item.id})">Delete</button>
                </div>
            `).join('') +
            '<button onclick="addItem()">Add Item</button>';
    });
}

function loadInventoryMgmt() {
    fetch('/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const content = document.getElementById('content');
        content.innerHTML = '<h2>Inventory</h2>' +
            data.map(item => `
                <div>
                    <span>${item.name}: ${item.quantity_in_stock} ${item.unit}</span>
                    <input type="number" id="qty-${item.id}" value="${item.quantity_in_stock}">
                    <button onclick="updateInventory(${item.id})">Update</button>
                </div>
            `).join('');
    });
}

function loadOrdersMgmt() {
    fetch('/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const content = document.getElementById('content');
        content.innerHTML = '<h2>Orders</h2>' +
            data.map(order => `
                <div>
                    <span>Order ${order.id} - Table ${order.table_number} - ${order.status}</span>
                    <select id="status-${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button onclick="updateStatus(${order.id})">Update</button>
                </div>
            `).join('');
    });
}

function updateStatus(id) {
    const status = document.getElementById(`status-${id}`).value;
    fetch(`/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
    });
}

function updateInventory(id) {
    const qty = document.getElementById(`qty-${id}`).value;
    fetch(`/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ quantity_in_stock: qty })
    });
}

// Add functions for edit, delete, add item, but simplified
function addItem() {
    // Prompt or form
    const name = prompt('Name');
    const price = prompt('Price');
    fetch('/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, price })
    }).then(() => loadMenuMgmt());
}

function editItem(id) {
    const name = prompt('New name');
    const price = prompt('New price');
    fetch(`/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, price, availability: true })
    }).then(() => loadMenuMgmt());
}

function deleteItem(id) {
    fetch(`/menu/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => loadMenuMgmt());
}