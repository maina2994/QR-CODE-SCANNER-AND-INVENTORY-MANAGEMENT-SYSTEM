// Toggle dropdown menu
document.querySelectorAll(".dropdown-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const dropdown = btn.nextElementSibling;
        dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    });
});
const searchBtn = document.querySelector('.search-btn');
const searchInput = document.querySelector('.search-input');

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.toLowerCase();
    const meals = document.querySelectorAll('.detail-card');

    meals.forEach(meal => {
        const name = meal.querySelector('h4').innerText.toLowerCase();
        if (name.includes(query)) {
            meal.style.display = 'block';
        } else {
            meal.style.display = 'none';
        }
    });
});
// Search functionality
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const meals = document.querySelectorAll(".meal-card");

    searchInput.addEventListener("keyup", function () {
        const searchValue = searchInput.value.toLowerCase();

        meals.forEach(function (meal) {
            const mealName = meal.querySelector("h4").textContent.toLowerCase();

            if (mealName.includes(searchValue)) {
                meal.style.display = "block";
            } else {
                meal.style.display = "none";
            }
        });
    });
});
// Search bar redirect to all-meals.html
const searchBtn = document.querySelector('.search-btn');
const searchInput = document.querySelector('.search-input');

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query !== '') {
        // Redirect to all-meals.html with search query
        window.location.href = `all-meals.html?search=${encodeURIComponent(query)}`;
    }
});
// CART SYSTEM
document.addEventListener("DOMContentLoaded", function () {

    let cart = [];
    const cartCount = document.getElementById("cart-count");
    const buttons = document.querySelectorAll(".add-to-cart");

    buttons.forEach((button) => {
        button.addEventListener("click", function () {

            const card = button.closest(".detail-card");
            const name = card.querySelector("h4").textContent;
            const price = card.querySelector(".price").textContent;

            const item = { name, price };
            cart.push(item);

            // Update cart count
            cartCount.textContent = cart.length;

            // Feedback
            alert(name + " added to cart!");
        });
    });

});