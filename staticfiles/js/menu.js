const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('table_id');
let cart = JSON.parse(localStorage.getItem('cart')) || [];

fetch('/menu')
    .then(res => res.json())
    .then(data => {
        const menuContainer = document.getElementById('menu-container');
        menuContainer.innerHTML = '';

        data.menu.forEach(item => {
            const div = document.createElement('div');
            div.className = 'menu-item';

            const imageUrl = item.image_url || '/images/food-placeholder.jpg';
            const priceFormatted = parseFloat(item.price).toFixed(2);
            const availabilityLabel = item.availability ? 'In stock' : 'Sold out';

            div.innerHTML = `
                <img src="${imageUrl}" alt="${item.name}" onerror="this.src='/images/food-placeholder.jpg'" />
                <h3>${item.name}</h3>
                <p>$${priceFormatted}</p>
                <small>${availabilityLabel}</small>
                <div class="item-footer">
                  <button ${item.availability ? '' : 'disabled'} onclick="addToCart(${item.id}, '${item.name}', ${item.price})">${item.availability ? 'Add to Cart' : 'Unavailable'}</button>
                </div>
            `;

            menuContainer.appendChild(div);
        });
    })
    .catch(err => {
        console.error('Menu load failed:', err);
        document.getElementById('menu-container').innerHTML = '<p>Unable to load menu at the moment.</p>';
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