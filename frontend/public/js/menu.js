const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('table_id');
let cart = JSON.parse(localStorage.getItem('cart')) || [];

fetch('/menu')
    .then(res => res.json())
    .then(data => {
        const menuContainer = document.getElementById('menu-container');
        data.menu.forEach(item => {
            const div = document.createElement('div');
            div.className = 'menu-item';
            div.innerHTML = `
                <h3>${item.name}</h3>
                <p>$${item.price}</p>
                <button onclick="addToCart(${item.id}, '${item.name}', ${item.price})">Add to Cart</button>
            `;
            menuContainer.appendChild(div);
        });
    });

function addToCart(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
}

document.getElementById('view-cart').addEventListener('click', () => {
    window.location.href = 'cart.html';
});