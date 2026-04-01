-- Sample Data for Restaurant Ordering System

USE restaurant_db;

-- Insert users

INSERT INTO users (name, email, password, role) VALUES

('Admin User', 'admin@restaurant.com', '$2a$10$examplehashedpassword', 'admin'),

('Staff User', 'staff@restaurant.com', '$2a$10$examplehashedpassword', 'staff');

-- Insert tables

INSERT INTO tables (table_number) VALUES (1), (2), (3), (4), (5);

-- Insert ingredients

INSERT INTO ingredients (name, quantity_in_stock, unit) VALUES

('Tomato', 100, 'kg'),

('Cheese', 50, 'kg'),

('Flour', 200, 'kg'),

('Chicken', 30, 'kg'),

('Rice', 150, 'kg');

-- Insert menu items

INSERT INTO menu_items (name, price, image_url, availability) VALUES

('Margherita Pizza', 12.99, '/images/pizza.jpg', TRUE),

('Chicken Burger', 9.99, '/images/burger.jpg', TRUE),

('Fried Rice', 8.99, '/images/rice.jpg', TRUE);

-- Insert menu item ingredients

INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_required) VALUES

(1, 1, 0.5), -- Pizza uses 0.5kg tomato

(1, 2, 0.2), -- 0.2kg cheese

(2, 4, 0.3), -- Burger uses 0.3kg chicken

(3, 5, 0.4); -- Rice uses 0.4kg rice