const socket = io();

socket.on('newOrder', (data) => {
    loadOrders();
});

function loadOrders() {
    fetch('/orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('orders-list');
        container.innerHTML = data.map(order => `
            <div>
                <p>Order ${order.id} - Table ${order.table_number} - ${order.status}</p>
                <button onclick="updateStatus(${order.id}, 'preparing')">Preparing</button>
                <button onclick="updateStatus(${order.id}, 'ready')">Ready</button>
                <button onclick="updateStatus(${order.id}, 'completed')">Completed</button>
            </div>
        `).join('');
    });
}

function updateStatus(id, status) {
    fetch(`/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status })
    }).then(() => loadOrders());
}

loadOrders();