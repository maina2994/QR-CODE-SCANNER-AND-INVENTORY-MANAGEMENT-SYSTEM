const params = new URLSearchParams(window.location.search);
const table = params.get('table');
function placeOrder() {
    const order = {
        table: table,
        items: cart
    };

    console.log(order); // later send to backend
}
function placeOrder() {
    alert("Order placed!");
}
// Highlight current page
const links = document.querySelectorAll(".sidebar-menus a");
links.forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add("active");
    }
});
// Highlight current page
const links = document.querySelectorAll(".sidebar-menus a");
links.forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add("active");
    }
});
<script>
// 🔥 INITIAL STOCK (runs once)
    if (!localStorage.getItem("stock")) {
        let stock = {
        "Chicken Burger": 10,
    "Beef Burger": 8,
    "Pepperoni Pizza": 5,
    "Black Coffee": 15,
    "Vanilla Ice Cream": 6,
    "Ugali & Beef Stew": 7
    };

    localStorage.setItem("stock", JSON.stringify(stock));
}
</script>
let lastStatus = "";

function checkOrderStatus() {
    let orders = JSON.parse(localStorage.getItem("allOrders")) || [];

    if (orders.length === 0) return;

    let latest = orders[orders.length - 1];

    if (latest.status !== lastStatus) {
        lastStatus = latest.status;
        showNotification(latest.status);
    }
}

setInterval(checkOrderStatus, 2000);
function showNotification(status) {
    let box = document.getElementById("notify");

    if (status === "pending") {
        box.innerText = "🟡 Order received!";
    }

    if (status === "cooking") {
        box.innerText = "🔵 Your food is being prepared!";
    }

    if (status === "ready") {
        box.innerText = "🟢 Your order is ready!";
    }

    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 4000);
}