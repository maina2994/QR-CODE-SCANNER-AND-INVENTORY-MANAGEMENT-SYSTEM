const { Pool } = require('pg');
const fs = require('fs');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('./database/schema-postgres.sql', 'utf8');

// Also insert seed data
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

db.query(sql)
    .then(() => db.query(seedSql))
    .then(() => { console.log('Database setup complete!'); process.exit(0); })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });