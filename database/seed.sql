-- Sample Data for Restaurant Ordering System

USE restaurant_db;

-- Insert users

INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@restaurant.com', '$2a$10$Co7nxiWhpelFxfljmZcAuuiF3WzcU6bRkV.biI2kgaxkB.U4ggd1a', 'admin'),
('Staff User', 'staff@restaurant.com', '$2a$10$Co7nxiWhpelFxfljmZcAuuiF3WzcU6bRkV.biI2kgaxkB.U4ggd1a', 'staff');

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
('Cheese Stuffed Burger', 11.50, '/images/cheese stuffed burger.jpg', TRUE),
('Grilled Chicken Burger', 10.75, '/images/grilled chicken burger.jpg', TRUE),
('Caesar Salad', 7.99, '/images/caesar salad.jpg', TRUE),
('Fried Rice', 8.99, '/images/friedchips.jpg', TRUE),
('Fish and Chips', 13.00, '/images/fish.jpg', TRUE),
('Pancakes', 6.50, '/images/pancakes.jpg', TRUE),
('Ice Cream Sundae', 5.50, '/images/icecream.jpg', TRUE);

-- Insert menu item ingredients

INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity_required) VALUES

(1, 1, 0.5), -- Pizza uses 0.5kg tomato
(1, 2, 0.2), -- 0.2kg cheese
(2, 4, 0.35), -- Burger uses 0.35kg chicken
(3, 4, 0.3), -- Grilled chicken burger uses 0.3kg chicken
(4, 1, 0.2), -- Salad uses tomato
(5, 5, 0.4), -- Rice uses rice
(6, 5, 0.5), -- fish & chips includes rice item for track (approx)
(7, 3, 0.25), -- pancakes requires flour
(8, 2, 0.15); -- ice cream requires cheese/dairy