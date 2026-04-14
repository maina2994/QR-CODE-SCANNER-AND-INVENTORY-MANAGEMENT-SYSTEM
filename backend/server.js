'use strict';
const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const cors       = require('cors');
const bodyParser = require('body-parser');
const { Pool }   = require('pg');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const qrcode     = require('qrcode');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ─── DATABASE ────────────────────────────────────────────────────────────────
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
db.connect()
    .then(() => console.log('PostgreSQL connected'))
    .catch(e => console.error('PostgreSQL connection error:', e.message));

const SECRET = process.env.JWT_SECRET || 'saveur_secret_2026';

// ─── POINTS CONFIG ───────────────────────────────────────────────────────────
// 1 KES spent = 1 point.  100 points = KES 50 off (0.5 KES per point)
const POINTS_PER_KES   = 1;
const KES_PER_POINT    = 0.5;
const LOW_STOCK_THRESHOLD_MULTIPLIER = 1.5; // alert when qty < reorder_level * 1.5

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function checkLowStock() {
    const { rows } = await db.query(`
        SELECT 'store' AS level, id, name, quantity, reorder_level, unit FROM inventory_store
        WHERE quantity <= reorder_level * $1
        UNION ALL
        SELECT 'kitchen' AS level, id, name, quantity, reorder_level, unit FROM inventory_kitchen
        WHERE quantity <= reorder_level * $1
    `, [LOW_STOCK_THRESHOLD_MULTIPLIER]);
    if (rows.length) io.emit('lowStock', rows);
    return rows;
}

async function deductKitchenInventory(orderId) {
    const { rows: items } = await db.query(
        'SELECT oi.menu_item_id, oi.quantity FROM order_items oi WHERE oi.order_id = $1', [orderId]
    );
    for (const item of items) {
        const { rows: ings } = await db.query(
            'SELECT kitchen_item_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = $1', [item.menu_item_id]
        );
        for (const ing of ings) {
            await db.query(
                'UPDATE inventory_kitchen SET quantity = GREATEST(0, quantity - $1), last_updated = NOW() WHERE id = $2',
                [ing.quantity_required * item.quantity, ing.kitchen_item_id]
            );
        }
    }
    // Hide menu items that are out of stock based on ingredients
    await db.query(`
        UPDATE menu_items SET availability = FALSE
        WHERE id IN (
            SELECT DISTINCT mii.menu_item_id
            FROM menu_item_ingredients mii
            JOIN inventory_kitchen ik ON mii.kitchen_item_id = ik.id
            WHERE ik.quantity < mii.quantity_required
        )
    `);
    checkLowStock();
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (!rows.length) return res.status(400).json({ message: 'User not found' });
        const user = rows[0];
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ message: 'Invalid password' });
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET);
        res.json({ token, role: user.role, name: user.name, id: user.id });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ message: 'All fields required' });
        if (!email.endsWith('@restaurant.com')) return res.status(400).json({ message: 'Must use @restaurant.com email' });
        if (password.length < 8) return res.status(400).json({ message: 'Password min 8 chars' });
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length) return res.status(400).json({ message: 'Email already registered' });
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)', [name, email, hash, role]);
        res.json({ message: 'Account created' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/me', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, name, email, role, phone FROM users WHERE id = $1', [req.user.id]);
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── MENU ROUTES ─────────────────────────────────────────────────────────────
app.get('/menu-full', async (req, res) => {
    try {
        const cats = await db.query('SELECT * FROM menu_categories ORDER BY sort_order');
        const items = await db.query(`
            SELECT mi.*, mc.name AS category_name, mc.slug AS category_slug
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mi.category_id = mc.id
            WHERE mi.availability = TRUE
            ORDER BY mc.sort_order, mi.is_featured DESC, mi.name
        `);
        const categories = cats.rows.map(c => ({
            ...c,
            dishes: items.rows.filter(i => i.category_id === c.id)
        }));
        res.json({ categories, menu: items.rows });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/menu', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM menu_items WHERE availability = TRUE ORDER BY category_id, name');
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/menu-admin', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT mi.*, mc.name AS category_name FROM menu_items mi LEFT JOIN menu_categories mc ON mi.category_id = mc.id ORDER BY mc.sort_order, mi.name');
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/menu', auth, requireRole('admin'), async (req, res) => {
    try {
        const { name, description, price_kes, image_url, category_id, prep_time_mins, is_featured } = req.body;
        await db.query('INSERT INTO menu_items (name, description, price_kes, image_url, category_id, prep_time_mins, is_featured) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [name, description, price_kes, image_url, category_id, prep_time_mins || 15, is_featured || false]);
        res.json({ message: 'Item added' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/menu/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        const { name, description, price_kes, image_url, category_id, availability, is_featured, prep_time_mins } = req.body;
        await db.query('UPDATE menu_items SET name=$1, description=$2, price_kes=$3, image_url=$4, category_id=$5, availability=$6, is_featured=$7, prep_time_mins=$8 WHERE id=$9',
            [name, description, price_kes, image_url, category_id, availability, is_featured, prep_time_mins, req.params.id]);
        res.json({ message: 'Item updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/menu/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        await db.query('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
        res.json({ message: 'Item deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── ORDER ROUTES ─────────────────────────────────────────────────────────────
app.post('/order', async (req, res) => {
    try {
        const { tableId, items, customerPhone, notes } = req.body;
        if (!items || !items.length) return res.status(400).json({ message: 'No items' });

        // Get/create customer
        let customerId = null;
        if (customerPhone) {
            let cust = await db.query('SELECT id FROM customers WHERE phone = $1', [customerPhone]);
            if (!cust.rows.length) {
                cust = await db.query('INSERT INTO customers (phone) VALUES ($1) RETURNING id', [customerPhone]);
            }
            customerId = cust.rows[0].id;
        }

        // Calculate total
        const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);

        // Find assigned waiter for this table
        const waiterQ = await db.query(`
            SELECT wa.waiter_id, u.name AS waiter_name
            FROM waiter_assignments wa
            JOIN users u ON wa.waiter_id = u.id
            WHERE wa.table_id = $1 AND wa.is_active = TRUE
            LIMIT 1
        `, [tableId || null]);
        const waiterId = waiterQ.rows[0]?.waiter_id || null;
        const waiterName = waiterQ.rows[0]?.waiter_name || null;

        const orderRes = await db.query(
            'INSERT INTO orders (table_id, customer_id, waiter_id, total_kes, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [tableId || null, customerId, waiterId, total, notes || null]
        );
        const orderId = orderRes.rows[0].id;

        // Insert items
        for (const item of items) {
            await db.query('INSERT INTO order_items (order_id, menu_item_id, quantity, price_kes, special_request) VALUES ($1,$2,$3,$4,$5)',
                [orderId, item.id, item.quantity, item.price, item.special_request || null]);
        }

        // Get full item details for kitchen display
        const { rows: orderItems } = await db.query(`
            SELECT oi.*, mi.name, mi.prep_time_mins, mc.name AS category
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            LEFT JOIN menu_categories mc ON mi.category_id = mc.id
            WHERE oi.order_id = $1
        `, [orderId]);

        // Emit to kitchen
        io.emit('newOrder', { orderId, tableId, items: orderItems, total, waiterName });

        // Emit to specific waiter if assigned
        if (waiterId) {
            io.emit('waiterOrderAlert', {
                waiterId,
                waiterName,
                orderId,
                tableId,
                items: orderItems,
                total
            });
        }

        res.json({ orderId, waiterName });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/order/:id', async (req, res) => {
    try {
        const { rows: order } = await db.query(`
            SELECT o.*, t.table_number, u.name AS waiter_name
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.waiter_id = u.id
            WHERE o.id = $1
        `, [req.params.id]);
        if (!order.length) return res.status(404).json({ message: 'Order not found' });
        const { rows: items } = await db.query(`
            SELECT oi.*, mi.name, mi.image_url, mc.name AS category
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            LEFT JOIN menu_categories mc ON mi.category_id = mc.id
            WHERE oi.order_id = $1
        `, [req.params.id]);
        res.json({ order: order[0], items });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/orders', auth, async (req, res) => {
    try {
        const roleFilter = req.user.role === 'waiter'
            ? 'WHERE o.waiter_id = $1'
            : req.user.role === 'kitchen' ? '' : '';
        const params = req.user.role === 'waiter' ? [req.user.id] : [];
        const { rows } = await db.query(`
            SELECT o.*, t.table_number, u.name AS waiter_name,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.waiter_id = u.id
            ${roleFilter}
            ORDER BY o.created_at DESC LIMIT 100
        `, params);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/orders/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);

        // When order is served → deduct inventory + award points
        if (status === 'served' || status === 'completed') {
            await deductKitchenInventory(req.params.id);

            // Award loyalty points
            const { rows: ord } = await db.query('SELECT customer_id, total_kes FROM orders WHERE id = $1', [req.params.id]);
            if (ord[0]?.customer_id) {
                const pts = Math.floor(ord[0].total_kes * POINTS_PER_KES);
                await db.query('UPDATE customers SET loyalty_points = loyalty_points + $1, total_spent = total_spent + $2 WHERE id = $3',
                    [pts, ord[0].total_kes, ord[0].customer_id]);
                await db.query('UPDATE orders SET points_earned = $1 WHERE id = $2', [pts, req.params.id]);
            }
        }

        io.emit('orderStatusUpdate', { orderId: req.params.id, status });
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Order history by phone
app.get('/customer/orders', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ message: 'phone required' });
        const { rows } = await db.query(`
            SELECT o.id, o.status, o.payment_status, o.total_kes, o.tip_kes, o.points_earned,
                   o.created_at, t.table_number
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            LEFT JOIN tables t ON o.table_id = t.id
            WHERE c.phone = $1
            ORDER BY o.created_at DESC LIMIT 20
        `, [phone]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── PAYMENT ─────────────────────────────────────────────────────────────────
app.post('/mpesa/stk-push', async (req, res) => {
    const { phone, amount, orderId } = req.body;
    if (!phone || !amount || !orderId) return res.status(400).json({ message: 'phone, amount, orderId required' });

    const consumerKey    = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode      = process.env.MPESA_SHORTCODE;
    const passkey        = process.env.MPESA_PASSKEY;
    const callbackUrl    = process.env.MPESA_CALLBACK_URL || 'https://qr-backend-app.onrender.com/mpesa/callback';

    if (!consumerKey || !consumerSecret) {
        // Sandbox simulation
        await db.query("UPDATE orders SET payment_status = 'pending', payment_method = 'mpesa' WHERE id = $1", [orderId]);
        // Simulate paid after 3s
        setTimeout(async () => {
            await db.query("UPDATE orders SET payment_status = 'paid' WHERE id = $1", [orderId]);
            io.emit('paymentUpdate', { orderId: parseInt(orderId), status: 'paid' });
        }, 3000);
        return res.json({ success: true, sandbox: true, message: 'Sandbox: STK Push simulated' });
    }

    try {
        const auth64 = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenRes = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            { headers: { Authorization: `Basic ${auth64}` } });
        const { access_token } = await tokenRes.json();

        const ts  = new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
        const pwd = Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64');

        const stkRes = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                BusinessShortCode: shortcode, Password: pwd, Timestamp: ts,
                TransactionType: 'CustomerPayBillOnline', Amount: Math.ceil(amount),
                PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
                CallBackURL: callbackUrl,
                AccountReference: `Saveur-${orderId}`,
                TransactionDesc: `Saveur Order #${orderId}`
            })
        });
        const stkData = await stkRes.json();
        if (stkData.ResponseCode === '0') {
            await db.query("UPDATE orders SET payment_status='pending', payment_method='mpesa', mpesa_checkout_id=$1 WHERE id=$2",
                [stkData.CheckoutRequestID, orderId]);
            res.json({ success: true, checkoutRequestId: stkData.CheckoutRequestID });
        } else {
            res.status(400).json({ success: false, message: stkData.CustomerMessage || 'STK Push failed' });
        }
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/mpesa/callback', async (req, res) => {
    try {
        const cb = req.body?.Body?.stkCallback;
        if (!cb) return res.json({ ResultCode: 0 });
        const status = cb.ResultCode === 0 ? 'paid' : 'failed';
        const { rows } = await db.query(
            "UPDATE orders SET payment_status=$1 WHERE mpesa_checkout_id=$2 RETURNING id, customer_id, total_kes",
            [status, cb.CheckoutRequestID]
        );
        if (rows[0]) {
            io.emit('paymentUpdate', { orderId: rows[0].id, status });
            if (status === 'paid' && rows[0].customer_id) {
                const pts = Math.floor(rows[0].total_kes * POINTS_PER_KES);
                await db.query('UPDATE customers SET loyalty_points = loyalty_points + $1, total_spent = total_spent + $2 WHERE id = $3',
                    [pts, rows[0].total_kes, rows[0].customer_id]);
                await db.query('UPDATE orders SET points_earned = $1 WHERE id = $2', [pts, rows[0].id]);
            }
        }
    } catch (e) { console.error('Callback error:', e.message); }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

app.get('/payment/status/:orderId', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT payment_status, points_earned FROM orders WHERE id = $1', [req.params.orderId]);
        if (!rows.length) return res.status(404).json({ message: 'Not found' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Record cash payment + tip
app.post('/order/:id/pay', async (req, res) => {
    try {
        const { method, tip_kes, customerPhone } = req.body;
        const { rows } = await db.query(
            "UPDATE orders SET payment_status='paid', payment_method=$1, tip_kes=$2 WHERE id=$3 RETURNING customer_id, total_kes",
            [method || 'cash', tip_kes || 0, req.params.id]
        );
        if (rows[0]?.customer_id) {
            const pts = Math.floor(rows[0].total_kes * POINTS_PER_KES);
            await db.query('UPDATE customers SET loyalty_points = loyalty_points + $1, total_spent = total_spent + $2 WHERE id = $3',
                [pts, rows[0].total_kes, rows[0].customer_id]);
            await db.query('UPDATE orders SET points_earned = $1 WHERE id = $2', [pts, req.params.id]);
        }
        if (tip_kes > 0) {
            const ord = await db.query('SELECT waiter_id FROM orders WHERE id = $1', [req.params.id]);
            if (ord.rows[0]?.waiter_id) {
                io.emit('tipReceived', { waiterId: ord.rows[0].waiter_id, tipKes: tip_kes, orderId: req.params.id });
            }
        }
        io.emit('paymentUpdate', { orderId: parseInt(req.params.id), status: 'paid' });
        res.json({ message: 'Payment recorded' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── TIPS ─────────────────────────────────────────────────────────────────────
app.post('/tips', auth, async (req, res) => {
    try {
        const { orderId, tipKes } = req.body;
        await db.query('UPDATE orders SET tip_kes = $1 WHERE id = $2', [tipKes, orderId]);
        const { rows } = await db.query('SELECT waiter_id FROM orders WHERE id = $1', [orderId]);
        if (rows[0]?.waiter_id) io.emit('tipReceived', { waiterId: rows[0].waiter_id, tipKes, orderId });
        res.json({ message: 'Tip recorded' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── LOYALTY POINTS ───────────────────────────────────────────────────────────
app.get('/customer/points', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ message: 'phone required' });
        const { rows } = await db.query('SELECT loyalty_points, total_spent FROM customers WHERE phone = $1', [phone]);
        if (!rows.length) return res.json({ loyalty_points: 0, total_spent: 0, kes_value: 0 });
        const pts = rows[0].loyalty_points;
        res.json({ loyalty_points: pts, total_spent: rows[0].total_spent, kes_value: pts * KES_PER_POINT });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/redeem-points', async (req, res) => {
    try {
        const { phone, points, orderId } = req.body;
        const { rows } = await db.query('SELECT id, loyalty_points FROM customers WHERE phone = $1', [phone]);
        if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
        const cust = rows[0];
        if (cust.loyalty_points < points) return res.status(400).json({ message: 'Insufficient points' });
        const discount = points * KES_PER_POINT;
        await db.query('UPDATE customers SET loyalty_points = loyalty_points - $1 WHERE id = $2', [points, cust.id]);
        await db.query('UPDATE orders SET points_redeemed = $1, total_kes = GREATEST(0, total_kes - $2) WHERE id = $3', [points, discount, orderId]);
        res.json({ message: 'Points redeemed', discount_kes: discount });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── INVENTORY ────────────────────────────────────────────────────────────────
app.get('/inventory/store', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM inventory_store ORDER BY category, name');
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/inventory/kitchen', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT ik.*, ist.name AS store_name FROM inventory_kitchen ik LEFT JOIN inventory_store ist ON ik.store_item_id = ist.id ORDER BY ik.name');
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/inventory/store/:id', auth, requireRole('admin','store'), async (req, res) => {
    try {
        const { quantity, reorder_level, name, unit, category } = req.body;
        await db.query('UPDATE inventory_store SET quantity=$1, reorder_level=$2, name=$3, unit=$4, category=$5, last_updated=NOW() WHERE id=$6',
            [quantity, reorder_level, name, unit, category, req.params.id]);
        await checkLowStock();
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/inventory/kitchen/:id', auth, requireRole('admin','kitchen','store'), async (req, res) => {
    try {
        const { quantity, reorder_level } = req.body;
        await db.query('UPDATE inventory_kitchen SET quantity=$1, reorder_level=$2, last_updated=NOW() WHERE id=$2',
            [quantity, reorder_level, req.params.id]);
        await checkLowStock();
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/inventory/store', auth, requireRole('admin','store'), async (req, res) => {
    try {
        const { name, quantity, unit, reorder_level, category } = req.body;
        const { rows } = await db.query(
            'INSERT INTO inventory_store (name, quantity, unit, reorder_level, category) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [name, quantity || 0, unit || 'units', reorder_level || 10, category || 'General']
        );
        res.json({ message: 'Item added', id: rows[0].id });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Transfer stock from store to kitchen
app.post('/inventory/transfer', auth, requireRole('admin','store','kitchen'), async (req, res) => {
    try {
        const { storeItemId, kitchenItemId, quantity, notes } = req.body;
        const { rows: storeItem } = await db.query('SELECT quantity FROM inventory_store WHERE id = $1', [storeItemId]);
        if (!storeItem.length || storeItem[0].quantity < quantity)
            return res.status(400).json({ message: 'Insufficient store stock' });

        await db.query('UPDATE inventory_store SET quantity = quantity - $1, last_updated = NOW() WHERE id = $2', [quantity, storeItemId]);
        await db.query('UPDATE inventory_kitchen SET quantity = quantity + $1, last_updated = NOW() WHERE id = $2', [quantity, kitchenItemId]);
        await db.query('INSERT INTO store_transactions (item_id, type, quantity, destination, notes, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
            [storeItemId, 'transfer', quantity, 'kitchen', notes || '', req.user.id]);
        await checkLowStock();
        res.json({ message: 'Transfer complete' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/inventory/transactions', auth, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT st.*, is2.name AS item_name, u.name AS user_name
            FROM store_transactions st
            JOIN inventory_store is2 ON st.item_id = is2.id
            LEFT JOIN users u ON st.user_id = u.id
            ORDER BY st.created_at DESC LIMIT 50
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Receive new stock into store
app.post('/inventory/receive', auth, requireRole('admin','store'), async (req, res) => {
    try {
        const { storeItemId, quantity, notes } = req.body;
        await db.query('UPDATE inventory_store SET quantity = quantity + $1, last_updated = NOW() WHERE id = $2', [quantity, storeItemId]);
        await db.query('INSERT INTO store_transactions (item_id, type, quantity, destination, notes, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
            [storeItemId, 'in', quantity, 'store', notes || '', req.user.id]);
        await checkLowStock();
        res.json({ message: 'Stock received' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── WAITER ASSIGNMENT ────────────────────────────────────────────────────────
app.get('/waiter-for-table/:tableId', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT wa.waiter_id, u.name, u.phone, wa.assigned_at
            FROM waiter_assignments wa
            JOIN users u ON wa.waiter_id = u.id
            WHERE wa.table_id = $1 AND wa.is_active = TRUE
            LIMIT 1
        `, [req.params.tableId]);
        res.json({ waiter: rows[0] || null });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/waiter/assign', auth, requireRole('admin','staff'), async (req, res) => {
    try {
        const { waiterId, tableId } = req.body;
        // Deactivate old assignment
        await db.query('UPDATE waiter_assignments SET is_active = FALSE WHERE table_id = $1', [tableId]);
        await db.query('INSERT INTO waiter_assignments (waiter_id, table_id, is_active) VALUES ($1,$2,TRUE)', [waiterId, tableId]);
        const { rows } = await db.query('SELECT name FROM users WHERE id = $1', [waiterId]);
        io.emit('waiterAssigned', { tableId, waiterId, waiterName: rows[0]?.name });
        res.json({ message: 'Assigned' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/waiter/orders/:waiterId', auth, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT o.*, t.table_number,
                (SELECT json_agg(json_build_object('name',mi.name,'quantity',oi.quantity,'category',mc.name))
                 FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
                 LEFT JOIN menu_categories mc ON mi.category_id = mc.id
                 WHERE oi.order_id = o.id) AS items
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            WHERE o.waiter_id = $1 AND o.status NOT IN ('completed')
            ORDER BY o.created_at DESC
        `, [req.params.waiterId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/waiter/ratings/:waiterId', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT AVG(rating)::NUMERIC(3,1) AS avg_rating, COUNT(*) AS total_reviews,
                   SUM(o.tip_kes) AS total_tips
            FROM reviews r
            JOIN orders o ON r.order_id = o.id
            WHERE r.waiter_id = $1
        `, [req.params.waiterId]);
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
app.post('/reviews', async (req, res) => {
    try {
        const { orderId, waiterId, rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating 1-5 required' });
        await db.query('INSERT INTO reviews (order_id, waiter_id, rating, comment) VALUES ($1,$2,$3,$4)',
            [orderId, waiterId, rating, comment || null]);
        res.json({ message: 'Review submitted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── RESERVATIONS ─────────────────────────────────────────────────────────────
// Package pricing
const PACKAGES = {
    bronze: { price_kes: 2000,  description: 'Standard table, welcome drink',       max_guests: 4  },
    silver: { price_kes: 5000,  description: 'Premium table, 3-course set menu',     max_guests: 6  },
    gold:   { price_kes: 12000, description: 'Private room, full 5-course tasting', max_guests: 10 }
};

app.get('/reservations/packages', (req, res) => res.json(PACKAGES));

app.post('/reservations', async (req, res) => {
    try {
        const { customer_name, customer_phone, customer_email, package: pkg, guests, date, time, special_requests } = req.body;
        if (!PACKAGES[pkg]) return res.status(400).json({ message: 'Invalid package' });
        if (guests > PACKAGES[pkg].max_guests) return res.status(400).json({ message: `Max ${PACKAGES[pkg].max_guests} guests for ${pkg}` });
        const deposit = PACKAGES[pkg].price_kes;
        const { rows } = await db.query(
            'INSERT INTO reservations (customer_name, customer_phone, customer_email, package, guests, date, time, special_requests, deposit_kes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
            [customer_name, customer_phone, customer_email, pkg, guests, date, time, special_requests || '', deposit]
        );
        io.emit('newReservation', { id: rows[0].id, customer_name, pkg, guests, date, time });
        res.json({ message: 'Reservation confirmed', reservationId: rows[0].id, deposit_kes: deposit });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/reservations', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM reservations ORDER BY date, time');
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/reservations/:id/status', auth, async (req, res) => {
    try {
        await db.query('UPDATE reservations SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
app.post('/attendance/checkin', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const existing = await db.query('SELECT id FROM attendance WHERE user_id = $1 AND date = $2', [req.user.id, today]);
        if (existing.rows.length) return res.status(400).json({ message: 'Already checked in today' });
        await db.query('INSERT INTO attendance (user_id, date, check_in) VALUES ($1,$2,NOW())', [req.user.id, today]);
        res.json({ message: 'Checked in', time: new Date().toISOString() });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/attendance/checkout', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const { rows } = await db.query('SELECT id, check_out FROM attendance WHERE user_id = $1 AND date = $2', [req.user.id, today]);
        if (!rows.length) return res.status(400).json({ message: 'No check-in found for today' });
        if (rows[0].check_out) return res.status(400).json({ message: 'Already checked out today' });
        await db.query('UPDATE attendance SET check_out = NOW() WHERE user_id = $1 AND date = $2', [req.user.id, today]);
        res.json({ message: 'Checked out', time: new Date().toISOString() });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/attendance/my', auth, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC LIMIT 30', [req.user.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/attendance/all', auth, requireRole('admin'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT a.*, u.name, u.role FROM attendance a JOIN users u ON a.user_id = u.id
            ORDER BY a.date DESC, u.name
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── QR CODE ──────────────────────────────────────────────────────────────────
app.get('/generate-qr/:tableId', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://qr-backend-app.onrender.com';
        const url = `${baseUrl}/?table_id=${req.params.tableId}`;
        const qr = await qrcode.toDataURL(url);
        await db.query('UPDATE tables SET qr_code_url = $1 WHERE id = $2', [url, req.params.tableId]);
        res.json({ qr, url });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── SOCKETS ──────────────────────────────────────────────────────────────────
io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    // Send current low stock on connect
    checkLowStock().catch(() => {});
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
