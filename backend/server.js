const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../frontend/public'));

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Root1234!', // Change as needed
    database: process.env.DB_NAME || 'restaurant_db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

// Middleware for auth
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    jwt.verify(token, 'secretkey', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Routes

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/menu.html'));
});

app.get('/menu', (req, res) => {
    const tableId = req.query.table_id;
    db.query('SELECT * FROM menu_items WHERE availability = TRUE', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ menu: results, tableId });
    });
});

app.post('/order', (req, res) => {
    const { tableId, items } = req.body;
    // Calculate total
    let total = 0;
    items.forEach(item => total += item.price * item.quantity);
    // Insert order
    db.query('INSERT INTO orders (table_id, total_amount) VALUES (?, ?)', [tableId, total], (err, result) => {
        if (err) return res.status(500).json(err);
        const orderId = result.insertId;
        // Insert order items
        const values = items.map(item => [orderId, item.id, item.quantity, item.price]);
        db.query('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?', [values], (err) => {
            if (err) return res.status(500).json(err);
            // Deduct inventory
            items.forEach(item => {
                db.query('SELECT * FROM menu_item_ingredients WHERE menu_item_id = ?', [item.id], (err, ingredients) => {
                    ingredients.forEach(ing => {
                        db.query('UPDATE ingredients SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?', [ing.quantity_required * item.quantity, ing.ingredient_id]);
                    });
                });
            });
            // Emit to staff
            io.emit('newOrder', { orderId, tableId, items, total });
            res.json({ orderId });
        });
    });
});

app.get('/order/:id', (req, res) => {
    const orderId = req.params.id;
    db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err) return res.status(500).json(err);
        db.query('SELECT oi.*, mi.name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = ?', [orderId], (err, items) => {
            if (err) return res.status(500).json(err);
            res.json({ order: order[0], items });
        });
    });
});

// Admin routes
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
        if (err) return res.status(500).json(err);
        if (users.length === 0) return res.status(400).json({ message: 'User not found' });
        const user = users[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json(err);
            if (!isMatch) return res.status(400).json({ message: 'Invalid password' });
            const token = jwt.sign({ id: user.id, role: user.role }, 'secretkey');
            res.json({ token });
        });
    });
});

app.get('/orders', authenticateToken, (req, res) => {
    db.query('SELECT o.*, t.table_number FROM orders o LEFT JOIN tables t ON o.table_id = t.id ORDER BY o.created_at DESC', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.put('/orders/:id/status', authenticateToken, (req, res) => {
    const { status } = req.body;
    db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Status updated' });
    });
});

app.get('/menu-admin', authenticateToken, (req, res) => {
    db.query('SELECT * FROM menu_items', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/menu', authenticateToken, (req, res) => {
    const { name, price, image_url } = req.body;
    db.query('INSERT INTO menu_items (name, price, image_url) VALUES (?, ?, ?)', [name, price, image_url], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Menu item added' });
    });
});

app.put('/menu/:id', authenticateToken, (req, res) => {
    const { name, price, image_url, availability } = req.body;
    db.query('UPDATE menu_items SET name = ?, price = ?, image_url = ?, availability = ? WHERE id = ?', [name, price, image_url, availability, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Menu item updated' });
    });
});

app.delete('/menu/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM menu_items WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Menu item deleted' });
    });
});

app.get('/inventory', authenticateToken, (req, res) => {
    db.query('SELECT * FROM ingredients', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.put('/inventory/:id', authenticateToken, (req, res) => {
    const { quantity_in_stock } = req.body;
    db.query('UPDATE ingredients SET quantity_in_stock = ? WHERE id = ?', [quantity_in_stock, req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Inventory updated' });
    });
});

// Generate QR codes
app.get('/generate-qr/:tableId', (req, res) => {
    const tableId = req.params.tableId;
    const url = `http://localhost:3000/menu?table_id=${tableId}`;
    qrcode.toDataURL(url, (err, qr) => {
        if (err) return res.status(500).json(err);
        db.query('UPDATE tables SET qr_code_url = ? WHERE id = ?', [qr, tableId]);
        res.json({ qr });
    });
});

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
