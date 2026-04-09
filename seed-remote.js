const { Pool } = require('pg');

const db = new Pool({
    connectionString: 'postgresql://qr_inventory_db_9wp2_user:uk2W5GwoqA7eeQCLnCLkxLhfnNFVhBex@dpg-d7bc449aae7s73c0olr0-a.frankfurt-postgres.render.com/qr_inventory_db_9wp2',
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        await db.query(`INSERT INTO tables (table_number) VALUES (1),(2),(3),(4),(5) ON CONFLICT DO NOTHING`);
        console.log('Tables inserted!');
        await db.query(`INSERT INTO ingredients (name,quantity_in_stock,unit) VALUES ('Tomato',100,'kg'),('Cheese',50,'kg'),('Flour',200,'kg'),('Chicken',30,'kg'),('Rice',150,'kg') ON CONFLICT DO NOTHING`);
        console.log('Ingredients inserted!');
        await db.query(`INSERT INTO menu_items (name,price,image_url,availability) VALUES ('Margherita Pizza',12.99,'/images/pizza.jpg',true),('Cheese Stuffed Burger',11.50,'/images/burger.jpg',true),('Grilled Chicken Burger',10.75,'/images/grilled chicken burger.jpg',true),('Caesar Salad',7.99,'/images/caesar salad.jpg',true),('Fried Rice',8.99,'/images/friedchips.jpg',true),('Fish and Chips',13.00,'/images/fish.jpg',true),('Pancakes',6.50,'/images/pancakes.jpg',true),('Ice Cream Sundae',5.50,'/images/icecream.jpg',true) ON CONFLICT DO NOTHING`);
        console.log('Menu items inserted!');
        await db.query(`INSERT INTO users (name,email,password,role) VALUES ('Admin User','admin@restaurant.com','$2a$10$Co7nxiWhpelFxfljmZcAuuiF3WzcU6bRkV.biI2kgaxkB.U4ggd1a','admin'),('Staff User','staff@restaurant.com','$2a$10$Co7nxiWhpelFxfljmZcAuuiF3WzcU6bRkV.biI2kgaxkB.U4ggd1a','staff') ON CONFLICT DO NOTHING`);
        console.log('Users inserted!');
        console.log('Seed complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

seed();