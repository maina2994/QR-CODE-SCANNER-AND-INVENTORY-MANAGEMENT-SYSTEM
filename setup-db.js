const { Pool } = require('pg');
const fs = require('fs');

console.log('Starting database setup...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    connectionTimeoutMillis: 30000,
});

const sql = fs.readFileSync('./database/schema-postgres.sql', 'utf8');

const seedSql = `
INSERT INTO tables (table_number) VALUES (1),(2),(3),(4),(5) ON CONFLICT DO NOTHING;
INSERT INTO ingredients (name, quantity_in_stock, unit) VALUES
('Tomato', 100, 'kg'),('Cheese', 50, 'kg'),('Flour', 200, 'kg'),('Chicken', 30, 'kg'),('Rice', 150, 'kg') ON CONFLICT DO NOTHING;
INSERT INTO menu_items (name, price, image_url, availability) VALUES
('Margherita Pizza', 12.99, '/images/pizza.jpg', TRUE),
('Cheese Stuffed Burger', 11.50, '/images/burger.jpg', TRUE),
('Grilled Chicken Burger', 10.75, '/images/grilled chicken burger.jpg', TRUE),
('Caesar Salad', 7.99, '/images/caesar salad.jpg', TRUE),
('Fried Rice', 8.99, '/images/friedchips.jpg', TRUE),
('Fish and Chips', 13.00, '/images/fish.jpg', TRUE),
('Pancakes', 6.50, '/images/pancakes.jpg', TRUE),
('Ice Cream Sundae', 5.50, '/images/icecream.jpg', TRUE) ON CONFLICT DO NOTHING;
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@restaurant.com', '$2a$10$Co7nxiWhpelFxfljmZcAuuiF3WzcU6bRkV.biI2kgaxkB.U4ggd1a', 'admin'),
('Staff User', 'staff@restaurant.com', '$2a$10$Co7nxiWhpelFxfljmZcAuuiF3WzcU6bRkV.biI2kgaxkB.U4ggd1a', 'staff') ON CONFLICT DO NOTHING;
`;

async function setup() {
    try {
        console.log('Connecting to database...');
        const client = await db.connect();
        console.log('Connected successfully!');
        console.log('Creating tables...');
        await client.query(sql);
        console.log('Tables created!');
        console.log('Inserting seed data...');
        await client.query(seedSql);
        console.log('Database setup complete!');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

setup();