const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// PostgreSQL connection pool
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test connection on startup
db.connect((err, client, release) => {
    if (err) {
        console.error('PostgreSQL connection error:', err.message);
        console.error('Continuing without DB...');
    }
    console.log('Connected to PostgreSQL');
    // Create tables if they don't exist
    const schema = require('fs').readFileSync('./database/schema-postgres.sql', 'utf8');
    client.query(schema, (err) => {
        if (err) console.error('Schema error:', err.message);
        else console.log('Tables ready!');
        release();
    });
});

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/menu.html'));
});

app.get('/menu', async (req, res) => {
    const tableId = req.query.table_id || null;
    try {
        const result = await db.query('SELECT * FROM menu_items WHERE availability = TRUE');
        res.json({ menu: result.rows, tableId });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/order', async (req, res) => {
    const { tableId, items } = req.body;
    if (!tableId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'tableId and non-empty items array are required' });
    }
    let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
        const orderResult = await db.query(
            'INSERT INTO orders (table_id, total_amount) VALUES ($1, $2) RETURNING id',
            [tableId, total]
        );
        const orderId = orderResult.rows[0].id;
        for (const item of items) {
            await db.query(
                'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.id, item.quantity, item.price]
            );
            const ingredients = await db.query(
                'SELECT * FROM menu_item_ingredients WHERE menu_item_id = $1', [item.id]
            );
            for (const ing of ingredients.rows) {
                await db.query(
                    'UPDATE ingredients SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2',
                    [ing.quantity_required * item.quantity, ing.ingredient_id]
                );
            }
        }
        io.emit('newOrder', { orderId, tableId, items, total });
        res.json({ orderId });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.get('/order/:id', async (req, res) => {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    try {
        const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (order.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
        const items = await db.query(
            'SELECT oi.*, mi.name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = $1',
            [orderId]
        );
        res.json({ order: order.rows[0], items: items.rows });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    try {
        const users = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (users.rows.length === 0) return res.status(400).json({ message: 'Invalid credentials' });
        const user = users.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.get('/orders', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT o.*, t.table_number FROM orders o LEFT JOIN tables t ON o.table_id = t.id ORDER BY o.created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.put('/orders/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    const allowed = ['pending', 'preparing', 'ready', 'completed'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status value' });
    try {
        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
        io.emit('orderStatusUpdate', { orderId: req.params.id, status });
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.get('/menu-admin', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM menu_items');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.post('/menu', authenticateToken, async (req, res) => {
    const { name, price, image_url } = req.body;
    if (!name || price == null) return res.status(400).json({ message: 'name and price are required' });
    try {
        await db.query('INSERT INTO menu_items (name, price, image_url) VALUES ($1, $2, $3)', [name, price, image_url || null]);
        res.json({ message: 'Menu item added' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.put('/menu/:id', authenticateToken, async (req, res) => {
    const { name, price, image_url, availability } = req.body;
    try {
        await db.query(
            'UPDATE menu_items SET name = $1, price = $2, image_url = $3, availability = $4 WHERE id = $5',
            [name, price, image_url, availability, req.params.id]
        );
        res.json({ message: 'Menu item updated' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.delete('/menu/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ingredients');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.put('/inventory/:id', authenticateToken, async (req, res) => {
    const { quantity_in_stock } = req.body;
    if (quantity_in_stock == null || quantity_in_stock < 0) {
        return res.status(400).json({ message: 'quantity_in_stock must be a non-negative number' });
    }
    try {
        await db.query('UPDATE ingredients SET quantity_in_stock = $1 WHERE id = $2', [quantity_in_stock, req.params.id]);
        res.json({ message: 'Inventory updated' });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err.message });
    }
});

app.get('/generate-qr/:tableId', async (req, res) => {
    const tableId = parseInt(req.params.tableId);
    if (isNaN(tableId)) return res.status(400).json({ message: 'Invalid table ID' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/menu?table_id=${tableId}`;
    try {
        const qr = await qrcode.toDataURL(url);
        await db.query('UPDATE tables SET qr_code_url = $1 WHERE id = $2', [qr, tableId]);
        res.json({ qr });
    } catch (err) {
        res.status(500).json({ message: 'QR generation error', error: err.message });
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
