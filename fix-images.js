const { Pool } = require('pg');
const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://qr_inventory_db_9wp2_user:uk2W5GwoqA7eeQCLnCLkxLhfnNFVhBex@dpg-d7bc449aae7s73c0olr0-a:5432/qr_inventory_db_9wp2',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
});

async function fix() {
    const updates = [
        ["Margherita Pizza", "/images/ppz.jpg"],
        ["Cheese Stuffed Burger", "/images/cheese stuffed burger.jpg"],
        ["Grilled Chicken Burger", "/images/grilled chicken burger.jpg"],
        ["Caesar Salad", "/images/caesar salad.jpg"],
        ["Fried Rice", "/images/friedchips.jpg"],
        ["Fish and Chips", "/images/fish.jpg"],
        ["Pancakes", "/images/pancakes.jpg"],
        ["Ice Cream Sundae", "/images/icecream.jpg"],
    ];
    for (const [name, url] of updates) {
        await db.query("UPDATE menu_items SET image_url=$1 WHERE name=$2", [url, name]);
        console.log(`Updated: ${name}`);
    }
    console.log('All images updated!');
    process.exit(0);
}
fix().catch(e => { console.error(e.message); process.exit(1); });