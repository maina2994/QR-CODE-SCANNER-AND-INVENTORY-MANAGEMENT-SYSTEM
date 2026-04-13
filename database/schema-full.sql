-- Full Schema for Saveur Restaurant System

-- Users (staff)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin','staff','waiter','kitchen','store')) NOT NULL DEFAULT 'staff',
    phone VARCHAR(20),
    avatar_initials VARCHAR(3),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    qr_code_url VARCHAR(500),
    capacity INT DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available'
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    sort_order INT DEFAULT 0
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_kes DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    category_id INT REFERENCES menu_categories(id),
    availability BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    prep_time_mins INT DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store Inventory (warehouse level)
CREATE TABLE IF NOT EXISTS inventory_store (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'units',
    reorder_level DECIMAL(10,2) DEFAULT 10,
    category VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kitchen Inventory (kitchen level)
CREATE TABLE IF NOT EXISTS inventory_kitchen (
    id SERIAL PRIMARY KEY,
    store_item_id INT REFERENCES inventory_store(id),
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'units',
    reorder_level DECIMAL(10,2) DEFAULT 5,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Item Ingredients (links to kitchen inventory)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id SERIAL PRIMARY KEY,
    menu_item_id INT NOT NULL REFERENCES menu_items(id),
    kitchen_item_id INT NOT NULL REFERENCES inventory_kitchen(id),
    quantity_required DECIMAL(10,2) NOT NULL
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    loyalty_points INT DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INT REFERENCES tables(id),
    customer_id INT REFERENCES customers(id),
    waiter_id INT REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('pending','preparing','ready','served','completed')) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    payment_method VARCHAR(20) DEFAULT 'cash',
    total_kes DECIMAL(10,2) DEFAULT 0,
    tip_kes DECIMAL(10,2) DEFAULT 0,
    points_earned INT DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    mpesa_checkout_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    menu_item_id INT NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL,
    price_kes DECIMAL(10,2) NOT NULL,
    special_request TEXT
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    table_id INT REFERENCES tables(id),
    package VARCHAR(20) CHECK (package IN ('bronze','silver','gold')) NOT NULL,
    guests INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    special_requests TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    deposit_kes DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waiter Assignments
CREATE TABLE IF NOT EXISTS waiter_assignments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    waiter_id INT REFERENCES users(id),
    table_id INT REFERENCES tables(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified BOOLEAN DEFAULT FALSE
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    waiter_id INT REFERENCES users(id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT
);

-- Store Transactions
CREATE TABLE IF NOT EXISTS store_transactions (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES inventory_store(id),
    type VARCHAR(20) CHECK (type IN ('in','out','transfer')),
    quantity DECIMAL(10,2) NOT NULL,
    destination VARCHAR(100),
    notes TEXT,
    user_id INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Categories
INSERT INTO menu_categories (name, slug, icon, sort_order) VALUES
('Food', 'food', '🍽️', 1),
('Drinks', 'drinks', '🥤', 2),
('Snacks', 'snacks', '🍿', 3),
('Desserts', 'desserts', '🍰', 4),
('Specials', 'specials', '⭐', 5)
ON CONFLICT DO NOTHING;

-- Seed Tables
INSERT INTO tables (table_number, capacity) VALUES
(1,4),(2,4),(3,6),(4,2),(5,8),(6,4),(7,4),(8,6),(9,2),(10,10)
ON CONFLICT DO NOTHING;
