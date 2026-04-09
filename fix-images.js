const { Pool } = require('pg');
const db = new Pool({
   connectionString: 'postgresql://qr_inventory_db_9wp2_user:uk2W5GwoqA7eeQCLnCLkxLhfnNFVhBex@dpg-d7bc449aae7s73c0olr0-a:5432/qr_inventory_db_9wp2',
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    await db.query("UPDATE menu_items SET image_url='/images/ppz.jpg' WHERE name='Margherita Pizza'");
    await db.query("UPDATE menu_items SET image_url='/images/cheese stuffed burger.jpg' WHERE name='Cheese Stuffed Burger'");
    await db.query("UPDATE menu_items SET image_url='/images/grilled chicken burger.jpg' WHERE name='Grilled Chicken Burger'");
    await db.query("UPDATE menu_items SET image_url='/images/caesar salad.jpg' WHERE name='Caesar Salad'");
    await db.query("UPDATE menu_items SET image_url='/images/friedchips.jpg' WHERE name='Fried Rice'");
    await db.query("UPDATE menu_items SET image_url='/images/fish.jpg' WHERE name='Fish and Chips'");
    await db.query("UPDATE menu_items SET image_url='/images/pancakes.jpg' WHERE name='Pancakes'");
    await db.query("UPDATE menu_items SET image_url='/images/icecream.jpg' WHERE name='Ice Cream Sundae'");
    console.log('Images updated!');
    process.exit(0);
}
fix().catch(e => { console.error(e.message); process.exit(1); });