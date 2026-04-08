const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('table_id');
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Fetch and display menu
function loadMenu() {
    console.log('Loading menu from API...');
    fetch('http://localhost:3000/menu')
        .then(res => {
            console.log('API Response status:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('Menu data received:', data);
            const items = data.menu || data.items || [];
            if (items && items.length > 0) {
                console.log('Displaying', items.length, 'items from API');
                displayMenu(items);
            } else {
                console.log('No items from API, loading sample menu');
                loadSampleMenu();
            }
        })
        .catch(err => {
            console.error('API Menu load failed:', err);
            console.log('Using sample menu instead');
            loadSampleMenu();
        });
}

function displayMenu(items) {
    console.log('displayMenu called with', items.length, 'items');
    const menuContainer = document.getElementById('menu-container');
    const menuLoading = document.getElementById('menu-loading');
    
    if (menuLoading) menuLoading.style.display = 'none';
    menuContainer.innerHTML = '';

    if (!items || items.length === 0) {
        console.log('No items to display');
        menuContainer.innerHTML = '<div class="no-menu"><p>No menu items available</p></div>';
        return;
    }

    items.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        if (!item.availability) div.classList.add('unavailable');

        const imageUrl = item.image_url || getPlaceholderImage(item.name);
        const priceFormatted = parseFloat(item.price).toFixed(2);
        const stockLabel = item.availability ? 
            '<span class="stock-label in-stock">✓ Available</span>' : 
            '<span class="stock-label out-of-stock">✗ Sold Out</span>';
        
        const cartItem = cart.find(c => c.id === item.id);
        const quantity = cartItem ? cartItem.quantity : 0;

        div.innerHTML = `
            <div style="position: relative;">
                <img src="${imageUrl}" alt="${item.name}" style="width: 100%; border-radius: 10px; aspect-ratio: 16/10; object-fit: cover;" onerror="this.src='${getPlaceholderImage(item.name)}'" />
                ${stockLabel}
            </div>
            <div style="padding: 0.5rem 0;">
                <h3>${item.name}</h3>
                <p style="font-size: 1.25rem; font-weight: bold; color: #1f8a70;">$${priceFormatted}</p>
                ${item.description ? `<small>${item.description}</small>` : ''}
            </div>
            <div class="item-footer">
                ${item.availability ? `
                    <div class="quantity-control">
                        <button onclick="decreaseQuantity(${item.id}, '${item.name}', ${item.price})" ${quantity === 0 ? 'disabled' : ''}>−</button>
                        <span class="quantity-display">${quantity}</span>
                        <button onclick="increaseQuantity(${item.id}, '${item.name}', ${item.price})">+</button>
                    </div>
                ` : `
                    <button disabled style="width: 100%;">Unavailable</button>
                `}
            </div>
        `;

        menuContainer.appendChild(div);
        console.log('Item', idx + 1, 'added:', item.name);
    });

    updateCartDisplay();
    console.log('Menu display complete');
}

function getPlaceholderImage(itemName) {
    const itemLower = itemName.toLowerCase();
    
    const emojiMap = {
        'burger': '🍔',
        'pizza': '🍕',
        'salad': '🥗',
        'steak': '🥩',
        'fish': '🐟',
        'chicken': '🍗',
        'pasta': '🍝',
        'soup': '🍲',
        'sushi': '🍣',
        'tacos': '🌮',
        'drink': '🥤',
        'coffee': '☕',
        'cake': '🍰',
        'fries': '🍟',
        'sandwich': '🥪',
        'rice': '🍚',
        'ramen': '🍜',
        'wings': '🍗'
    };

    let emoji = '🍽️';
    for (const [key, value] of Object.entries(emojiMap)) {
        if (itemLower.includes(key)) {
            emoji = value;
            break;
        }
    }

    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 125">
            <rect width="200" height="125" fill="#f0f0f0"/>
            <text x="100" y="70" font-size="50" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
            <text x="100" y="110" font-size="12" text-anchor="middle" fill="#999">${itemName}</text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svgContent);
}

function loadSampleMenu() {
    console.log('Loading sample menu as fallback');
    
    const sampleItems = [
        { id: 1, name: 'Margherita Pizza', price: 12.99, availability: true, description: 'Classic pizza with fresh basil & mozzarella' },
        { id: 2, name: 'Chicken Burger', price: 9.99, availability: true, description: 'Juicy grilled chicken with lettuce & tomato' },
        { id: 3, name: 'Fried Rice', price: 8.99, availability: true, description: 'Fragrant fried rice with vegetables & egg' },
        { id: 4, name: 'Cheese Stuffed Burger', price: 11.50, availability: true, description: 'Burger with melted cheese inside' },
        { id: 5, name: 'Caesar Salad', price: 10.99, availability: true, description: 'Fresh greens with parmesan & croutons' },
        { id: 6, name: 'Grilled Steak Frites', price: 22.99, availability: true, description: 'Premium ribeye with crispy fries' },
        { id: 7, name: 'Fish & Chips', price: 13.99, availability: true, description: 'Battered cod with tartar sauce & fries' },
        { id: 8, name: 'Vegetarian Pasta', price: 11.99, availability: true, description: 'Pasta primavera with seasonal vegetables' },
        { id: 9, name: 'Spicy Chicken Wings', price: 9.99, availability: true, description: 'Buffalo wings with blue cheese dip' },
        { id: 10, name: 'Salmon Sushi Roll', price: 15.99, availability: true, description: 'Fresh salmon with avocado & cucumber' }
    ];
    
    displayMenu(sampleItems);
}

function increaseQuantity(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    loadMenu();
}

function decreaseQuantity(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity--;
        if (existing.quantity === 0) {
            cart = cart.filter(item => item.id !== id);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    loadMenu();
}

function updateCartDisplay() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    if (cartCount) cartCount.textContent = totalItems;
    if (cartTotal) cartTotal.textContent = totalItems;
}

// Load menu on page load
console.log('Initializing menu page...');
loadMenu();

// Ensure sample menu loads if API fails
setTimeout(() => {
    const container = document.getElementById('menu-container');
    if (!container || container.children.length === 0) {
        console.log('Menu not loaded after 2s, loading sample menu');
        loadSampleMenu();
    }
}, 2000);

// Update display every 2 seconds
setInterval(updateCartDisplay, 2000);
    updateCartDisplay();
    loadMenu();
}

function decreaseQuantity(id, name, price) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity--;
        if (existing.quantity === 0) {
            cart = cart.filter(item => item.id !== id);
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    loadMenu();
}

function updateCartDisplay() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    if (cartCount) cartCount.textContent = totalItems;
    if (cartTotal) cartTotal.textContent = totalItems;
}

document.getElementById('view-cart').addEventListener('click', () => {
    window.location.href = 'cart.html';
});

// Load menu on page load
loadMenu();

// Update display every 2 seconds to sync with other pages
setInterval(updateCartDisplay, 2000);