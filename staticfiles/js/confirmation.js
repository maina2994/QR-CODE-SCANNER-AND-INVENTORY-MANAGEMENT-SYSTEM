const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');
document.getElementById('order-id').textContent = orderId;

document.getElementById('view-order').addEventListener('click', () => {
    window.location.href = `order-details.html?orderId=${orderId}`;
});