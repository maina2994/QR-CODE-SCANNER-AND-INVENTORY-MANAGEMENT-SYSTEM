-- ============================================================
-- SAVEUR RESTAURANT — Full PostgreSQL Schema
-- Run once on a fresh DB, safe to re-run (IF NOT EXISTS)
-- ============================================================

-- Users (staff)
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(20) CHECK (role IN ('admin','staff','waiter','kitchen','store')) NOT NULL DEFAULT 'staff',
    phone           VARCHAR(20),
    avatar_initials VARCHAR(3),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tables
CREATE TABLE IF NOT EXISTS tables (
    id           SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    qr_code_url  VARCHAR(500),
    capacity     INT DEFAULT 4,
    status       VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','occupied','reserved'))
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    icon       VARCHAR(50),
    sort_order INT DEFAULT 0
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    price_kes     DECIMAL(10,2) NOT NULL,
    image_url     VARCHAR(500),
    category_id   INT REFERENCES menu_categories(id) ON DELETE SET NULL,
    availability  BOOLEAN DEFAULT TRUE,
    is_featured   BOOLEAN DEFAULT FALSE,
    prep_time_mins INT DEFAULT 15,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store Inventory (warehouse level)
CREATE TABLE IF NOT EXISTS inventory_store (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    quantity      DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit          VARCHAR(50) DEFAULT 'units',
    reorder_level DECIMAL(10,2) DEFAULT 10,
    category      VARCHAR(100) DEFAULT 'General',
    last_updated  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kitchen Inventory (kitchen level)
CREATE TABLE IF NOT EXISTS inventory_kitchen (
    id            SERIAL PRIMARY KEY,
    store_item_id INT REFERENCES inventory_store(id) ON DELETE SET NULL,
    name          VARCHAR(255) NOT NULL,
    quantity      DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit          VARCHAR(50) DEFAULT 'units',
    reorder_level DECIMAL(10,2) DEFAULT 5,
    last_updated  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Item → Kitchen Inventory ingredients link
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id                SERIAL PRIMARY KEY,
    menu_item_id      INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    kitchen_item_id   INT NOT NULL REFERENCES inventory_kitchen(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,2) NOT NULL
);

-- Store Transactions (audit log)
CREATE TABLE IF NOT EXISTS store_transactions (
    id          SERIAL PRIMARY KEY,
    item_id     INT REFERENCES inventory_store(id),
    type        VARCHAR(20) CHECK (type IN ('in','out','transfer')),
    quantity    DECIMAL(10,2) NOT NULL,
    destination VARCHAR(100),
    notes       TEXT,
    user_id     INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(255),
    phone          VARCHAR(20) UNIQUE,
    email          VARCHAR(255),
    loyalty_points INT DEFAULT 0,
    total_spent    DECIMAL(10,2) DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id                 SERIAL PRIMARY KEY,
    table_id           INT REFERENCES tables(id),
    customer_id        INT REFERENCES customers(id),
    waiter_id          INT REFERENCES users(id),
    status             VARCHAR(20) CHECK (status IN ('pending','preparing','ready','served','completed')) DEFAULT 'pending',
    payment_status     VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','failed')),
    payment_method     VARCHAR(20) DEFAULT 'cash',
    total_kes          DECIMAL(10,2) DEFAULT 0,
    tip_kes            DECIMAL(10,2) DEFAULT 0,
    points_earned      INT DEFAULT 0,
    points_redeemed    INT DEFAULT 0,
    mpesa_checkout_id  VARCHAR(100),
    notes              TEXT,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id    INT NOT NULL REFERENCES menu_items(id),
    quantity        INT NOT NULL,
    price_kes       DECIMAL(10,2) NOT NULL,
    special_request TEXT
);

-- Waiter Assignments
CREATE TABLE IF NOT EXISTS waiter_assignments (
    id          SERIAL PRIMARY KEY,
    waiter_id   INT REFERENCES users(id),
    table_id    INT REFERENCES tables(id),
    is_active   BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id         SERIAL PRIMARY KEY,
    order_id   INT REFERENCES orders(id),
    waiter_id  INT REFERENCES users(id),
    rating     INT CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id),
    date       DATE NOT NULL,
    check_in   TIMESTAMP,
    check_out  TIMESTAMP,
    status     VARCHAR(20) DEFAULT 'present',
    notes      TEXT,
    UNIQUE(user_id, date)
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id               SERIAL PRIMARY KEY,
    customer_name    VARCHAR(255) NOT NULL,
    customer_phone   VARCHAR(20) NOT NULL,
    customer_email   VARCHAR(255),
    table_id         INT REFERENCES tables(id),
    package          VARCHAR(20) CHECK (package IN ('bronze','silver','gold')) NOT NULL,
    guests           INT NOT NULL,
    date             DATE NOT NULL,
    time             TIME NOT NULL,
    special_requests TEXT,
    status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
    deposit_kes      DECIMAL(10,2) DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_table         ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter        ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_waiter_assign_table  ON waiter_assignments(table_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone);

-- ─── SEED DATA ─────────────────────────────────────────────────────────────────

-- Categories
INSERT INTO menu_categories (name, slug, icon, sort_order) VALUES
('Food',     'food',     '🍽️', 1),
('Drinks',   'drinks',   '🥤', 2),
('Snacks',   'snacks',   '🍿', 3),
('Desserts', 'desserts', '🍰', 4),
('Specials', 'specials', '⭐', 5)
ON CONFLICT (slug) DO NOTHING;

-- Tables
INSERT INTO tables (table_number, capacity) VALUES
(1,4),(2,4),(3,6),(4,2),(5,8),(6,4),(7,4),(8,6),(9,2),(10,10)
ON CONFLICT (table_number) DO NOTHING;

-- Sample menu items (prices in KES)
INSERT INTO menu_items (name, description, price_kes, category_id, is_featured, prep_time_mins) VALUES
-- Food
('Nyama Choma',      'Slow-roasted goat ribs, served with ugali and kachumbari', 1800, 1, TRUE,  35),
('Grilled Tilapia',  'Whole tilapia, lemon-herb butter, sukuma wiki, ugali',      1400, 1, TRUE,  25),
('Chicken Biryani',  'Fragrant basmati, tender chicken thighs, raita',            950,  1, FALSE, 30),
('Beef Pilau',       'Kenyan-spiced pilau rice, slow-braised beef',               850,  1, FALSE, 25),
('Veggie Curry',     'Seasonal vegetables, coconut cream, roti',                  650,  1, FALSE, 20),
('Club Sandwich',    'Triple-decker, chicken, bacon, avocado, fries',             750,  1, FALSE, 15),
('Pasta Arrabiata',  'Penne, spicy tomato, garlic, fresh basil',                  700,  1, FALSE, 20),
-- Drinks
('Dawa Cocktail',    'Vodka, honey, lime, ginger — Swahili remedy',               600,  2, TRUE,  5),
('Passion Juice',    'Fresh-blended passion fruit, mint, sugar cane',             250,  2, FALSE, 5),
('Cold Tusker',      'Chilled Kenyan lager, 500ml',                               350,  2, FALSE, 2),
('Mango Smoothie',   'Fresh mango, yoghurt, honey',                               300,  2, FALSE, 5),
('Iced Chai Latte',  'Masala tea, oat milk, over ice',                            280,  2, FALSE, 5),
-- Snacks
('Bhajia',           'Crispy potato fritters, tamarind chutney',                  350,  3, FALSE, 10),
('Samosas (3 pcs)',  'Beef & vegetable mix, mint sauce',                          300,  3, TRUE,  10),
('Chips Masala',     'Spiced fries, chilli sauce, lime',                          280,  3, FALSE, 12),
('Mandazi',          'Swahili fried dough, cardamom sugar',                       200,  3, FALSE, 8),
-- Desserts
('Mabuyu',           'Baobab seeds, sugar, chilli — Coastal classic',             200,  4, FALSE, 3),
('Chocolate Lava',   'Warm chocolate fondant, vanilla ice cream',                 550,  4, TRUE,  15),
('Mango Sorbet',     'Fresh mango sorbet, mint, lime zest',                       380,  4, FALSE, 5),
-- Specials
('Chef''s Tasting',  '5-course seasonal menu, wine pairing available',            4500, 5, TRUE,  60),
('Sunday Roast',     'Slow-roasted beef, all trimmings, available Sundays only',  2200, 5, FALSE, 45)
ON CONFLICT DO NOTHING;

-- Sample store inventory
INSERT INTO inventory_store (name, quantity, unit, reorder_level, category) VALUES
('Beef (kg)',          50,   'kg',     10,  'Meat'),
('Chicken (kg)',       40,   'kg',     10,  'Meat'),
('Tilapia (kg)',       30,   'kg',     8,   'Fish'),
('Goat (kg)',          25,   'kg',     8,   'Meat'),
('Rice Basmati (kg)',  80,   'kg',     15,  'Dry Goods'),
('Ugali Flour (kg)',   100,  'kg',     20,  'Dry Goods'),
('Cooking Oil (L)',    40,   'litres', 10,  'Oils'),
('Onions (kg)',        30,   'kg',     8,   'Vegetables'),
('Tomatoes (kg)',      20,   'kg',     8,   'Vegetables'),
('Garlic (kg)',        5,    'kg',     2,   'Vegetables'),
('Fresh Mangoes (kg)', 25,   'kg',     5,   'Fruits'),
('Passion Fruits',     100,  'units',  20,  'Fruits'),
('Tusker Beer (cans)', 200,  'units',  50,  'Beverages'),
('Vodka (750ml)',      20,   'bottles',5,   'Beverages'),
('Chocolate (kg)',     10,   'kg',     3,   'Baking'),
('Flour (kg)',         60,   'kg',     15,  'Dry Goods'),
('Sugar (kg)',         40,   'kg',     10,  'Dry Goods'),
('Milk (L)',           30,   'litres', 10,  'Dairy'),
('Butter (kg)',        10,   'kg',     3,   'Dairy'),
('Charcoal (kg)',      150,  'kg',     30,  'Fuel')
ON CONFLICT DO NOTHING;

-- Sample kitchen inventory (mirrors store)
INSERT INTO inventory_kitchen (store_item_id, name, quantity, unit, reorder_level) VALUES
(1,  'Beef (kg)',          8,   'kg',     3),
(2,  'Chicken (kg)',       6,   'kg',     3),
(3,  'Tilapia (kg)',       5,   'kg',     2),
(4,  'Goat (kg)',          4,   'kg',     2),
(5,  'Rice Basmati (kg)',  12,  'kg',     5),
(6,  'Ugali Flour (kg)',   15,  'kg',     5),
(7,  'Cooking Oil (L)',    6,   'litres', 2),
(8,  'Onions (kg)',        5,   'kg',     2),
(9,  'Tomatoes (kg)',      4,   'kg',     2),
(10, 'Garlic (kg)',        1,   'kg',     0.5),
(11, 'Fresh Mangoes (kg)', 4,   'kg',     1),
(12, 'Passion Fruits',     20,  'units',  5),
(14, 'Vodka (750ml)',      4,   'bottles',1),
(15, 'Chocolate (kg)',     2,   'kg',     0.5),
(16, 'Flour (kg)',         8,   'kg',     3),
(17, 'Sugar (kg)',         6,   'kg',     2),
(18, 'Milk (L)',           5,   'litres', 2),
(19, 'Butter (kg)',        2,   'kg',     0.5)
ON CONFLICT DO NOTHING;
