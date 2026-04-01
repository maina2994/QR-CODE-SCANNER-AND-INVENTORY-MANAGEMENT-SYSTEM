# QR Code-Based Self-Ordering and Inventory Management System

## Overview

This is a complete web-based system for restaurants to allow customers to order via QR codes and manage inventory automatically.

## Features

- Customer QR code ordering
- Real-time order management
- Inventory tracking
- Admin panel for menu and inventory management

## Setup

1. Install dependencies: `npm install`

2. Set up MySQL database: Run the SQL scripts in `database/schema.sql` and `database/seed.sql`

3. Update database credentials in `backend/server.js`

4. Start the server: `npm start`

5. Access the application at `http://localhost:3000`

## Usage

- Generate QR codes for tables via `/generate-qr/:tableId`
- Customers scan QR to access menu
- Staff and admin login via `/login.html`

## Tech Stack

- Backend: Node.js, Express, MySQL, Socket.io
- Frontend: HTML, CSS, JavaScript