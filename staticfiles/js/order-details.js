const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');

fetch(`/order/${orderId}`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('order-details');
        container.innerHTML = `
            <p>Status: ${data.order.status}</p>
            <p>Total: $${data.order.total_amount}</p>
            <ul>
                ${data.items.map(item => `<li>${item.name} x${item.quantity} - $${item.price * item.quantity}</li>`).join('')}
            </ul>
        `;
    });