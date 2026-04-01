-- Database Schema for Restaurant Ordering System

CREATE DATABASE IF NOT EXISTS restaurant_db;

USE restaurant_db;

-- Users table

CREATE TABLE users (

    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    password VARCHAR(255) NOT NULL,

    role ENUM('admin', 'staff') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- Tables table for QR codes

CREATE TABLE tables (

    id INT AUTO_INCREMENT PRIMARY KEY,

    table_number INT UNIQUE NOT NULL,

    qr_code_url VARCHAR(500)

);

-- MenuItems table

CREATE TABLE menu_items (

    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    price DECIMAL(10,2) NOT NULL,

    image_url VARCHAR(500),

    availability BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- Orders table

CREATE TABLE orders (

    id INT AUTO_INCREMENT PRIMARY KEY,

    table_id INT,

    status ENUM('pending', 'preparing', 'ready', 'completed') DEFAULT 'pending',

    total_amount DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (table_id) REFERENCES tables(id)

);

-- OrderItems table

CREATE TABLE order_items (

    id INT AUTO_INCREMENT PRIMARY KEY,

    order_id INT NOT NULL,

    menu_item_id INT NOT NULL,

    quantity INT NOT NULL,

    price DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (order_id) REFERENCES orders(id),

    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)

);

-- Ingredients table

CREATE TABLE ingredients (

    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    quantity_in_stock DECIMAL(10,2) NOT NULL,

    unit VARCHAR(50) DEFAULT 'units'

);

-- MenuItemIngredients table

CREATE TABLE menu_item_ingredients (

    id INT AUTO_INCREMENT PRIMARY KEY,

    menu_item_id INT NOT NULL,

    ingredient_id INT NOT NULL,

    quantity_required DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),

    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)

);