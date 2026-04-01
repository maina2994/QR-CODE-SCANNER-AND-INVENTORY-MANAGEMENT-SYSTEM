let cart = JSON.parse(localStorage.getItem('cart')) || [];
const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('table_id') || localStorage.getItem('tableId');
localStorage.setItem('tableId', tableId);

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    cartContainer.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        cartContainer.appendChild(div);
    });
}

renderCart();

document.getElementById('place-order').addEventListener('click', () => {
    fetch('/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, items: cart })
    })
    .then(res => res.json())
    .then(data => {
        localStorage.removeItem('cart');
        window.location.href = `confirmation.html?orderId=${data.orderId}`;
    });
});

document.getElementById('back-to-menu').addEventListener('click', () => {
    window.location.href = 'menu.html';
});