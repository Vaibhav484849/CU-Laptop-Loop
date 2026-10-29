/**
 * ============================================================
 * CU LaptopLoop — Backend Server (Node.js + Express + MySQL)
 * ============================================================
 * Beginner-friendly server that:
 * 1. Serves the single-page frontend (index.html)
 * 2. Connects to the MySQL database (cu_laptoploop)
 * 3. Uses RentalLogic.java for core calculations & validation
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves index.html directly

// MySQL Connection Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cu_laptoploop',
    waitForConnections: true,
    connectionLimit: 10
};

let pool = null;
async function initDB() {
    try {
        pool = mysql.createPool(dbConfig);
        const [rows] = await pool.query('SELECT 1');
        console.log('[DB] Connected to MySQL database "cu_laptoploop" successfully.');
    } catch (err) {
        console.warn('[DB WARNING] Could not connect to MySQL:', err.message);
        console.warn('[DB WARNING] Running in demo mode. Make sure MySQL is running and database.sql is imported.');
    }
}
initDB();

// ------------------------------------------------------------
// Java Logic Bridge Helpers
// Invokes the compiled RentalLogic.class for core business rules
// ------------------------------------------------------------
function callJavaLogic(command, ...args) {
    try {
        const cmd = `java RentalLogic ${command} ${args.join(' ')}`;
        const output = execSync(cmd, { cwd: __dirname, encoding: 'utf-8' });
        return JSON.parse(output.trim());
    } catch (err) {
        // Fallback calculations if Java command fails
        if (command === 'calculate') {
            const price = parseFloat(args[0]);
            const start = new Date(args[1]);
            const end = new Date(args[2]);
            const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return { valid: diffDays > 0, days: diffDays, pricePerDay: price, totalPrice: diffDays * price };
        }
        if (command === 'txn-id') {
            return { transactionId: 'TXN_CU_' + Date.now().toString().slice(-6) + '_DEMO' };
        }
        return { valid: true };
    }
}

// ============================================================
// API Endpoints
// ============================================================

// 1. Get All Laptops (with search & filter)
app.get('/api/laptops', async (req, res) => {
    const { q, brand, maxPrice } = req.query;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    try {
        let sql = `SELECT l.*, u.name as owner_name, u.uid as owner_uid, u.email as owner_email, u.phone as owner_phone 
                   FROM laptops l JOIN users u ON l.owner_id = u.user_id WHERE l.is_active = TRUE`;
        const params = [];

        if (q) {
            sql += ` AND (LOWER(l.model) LIKE ? OR LOWER(l.specs) LIKE ? OR LOWER(l.pickup_location) LIKE ?)`;
            params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
        }
        if (brand && brand !== 'all') {
            sql += ` AND LOWER(l.brand) = LOWER(?)`;
            params.push(brand);
        }
        if (maxPrice) {
            sql += ` AND l.price_per_day <= ?`;
            params.push(parseFloat(maxPrice));
        }

        sql += ` ORDER BY l.laptop_id DESC`;
        const [rows] = await pool.query(sql, params);
        res.json({ success: true, laptops: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Add a New Laptop Listing
app.post('/api/laptops', async (req, res) => {
    const { owner_id, brand, model, specs, description, price_per_day, pickup_location, image_url } = req.body;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    try {
        const sql = `INSERT INTO laptops (owner_id, brand, model, specs, description, price_per_day, pickup_location, image_url)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.query(sql, [
            owner_id || 1, brand, model, specs, description || '', price_per_day, pickup_location, image_url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
        ]);
        res.json({ success: true, laptop_id: result.insertId, message: 'Laptop listed successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. User Login
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    try {
        const sql = `SELECT * FROM users WHERE (LOWER(email) = LOWER(?) OR UPPER(uid) = UPPER(?)) AND password = ?`;
        const [rows] = await pool.query(sql, [identifier, identifier, password]);
        if (rows.length > 0) {
            const user = rows[0];
            delete user.password;
            res.json({ success: true, user, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid UID/Email or password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. User Registration (Validates UID using Java logic)
app.post('/api/auth/register', async (req, res) => {
    const { name, uid, email, password, department, phone } = req.body;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    // Validate UID format using Java logic engine
    const javaCheck = callJavaLogic('validate-uid', uid);
    if (!javaCheck.valid) {
        return res.status(400).json({ success: false, message: 'Invalid CU UID format. Example: 21BCS1014' });
    }

    try {
        const sql = `INSERT INTO users (name, uid, email, password, department, phone) VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await pool.query(sql, [name, uid.toUpperCase(), email.toLowerCase(), password, department || 'CSE', phone || '']);
        res.json({
            success: true,
            user: { user_id: result.insertId, name, uid: uid.toUpperCase(), email: email.toLowerCase(), department, phone },
            message: 'Registered successfully!'
        });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Email or UID already registered.' });
    }
});

// 5. Create Rental Booking (Calls Java for price & duration calculations)
app.post('/api/bookings', async (req, res) => {
    const { laptop_id, renter_id, start_date, end_date } = req.body;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    try {
        // Fetch laptop daily price and owner
        const [laptops] = await pool.query('SELECT owner_id, price_per_day FROM laptops WHERE laptop_id = ?', [laptop_id]);
        if (laptops.length === 0) return res.status(404).json({ success: false, message: 'Laptop not found' });

        const laptop = laptops[0];
        if (laptop.owner_id === renter_id) {
            return res.status(400).json({ success: false, message: 'You cannot rent your own laptop.' });
        }

        // Call Java logic to compute rental duration and total price
        const calc = callJavaLogic('calculate', laptop.price_per_day, start_date, end_date);
        if (!calc.valid) {
            return res.status(400).json({ success: false, message: calc.message || 'Invalid rental dates' });
        }

        // Check for double booking collision with active/approved rentals
        const [existing] = await pool.query(
            `SELECT start_date, end_date FROM bookings WHERE laptop_id = ? AND status IN ('APPROVED', 'ACTIVE')`,
            [laptop_id]
        );

        for (const b of existing) {
            const overlap = callJavaLogic(
                'overlap',
                b.start_date.toISOString().split('T')[0],
                b.end_date.toISOString().split('T')[0],
                start_date,
                end_date
            );
            if (overlap.overlap) {
                return res.status(400).json({ success: false, message: 'Dates conflict with an existing confirmed booking.' });
            }
        }

        // Insert booking
        const insertSql = `INSERT INTO bookings (laptop_id, renter_id, start_date, end_date, total_days, total_price, status)
                           VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`;
        const [bResult] = await pool.query(insertSql, [laptop_id, renter_id, start_date, end_date, calc.days, calc.totalPrice]);

        // Insert initial pending payment
        await pool.query('INSERT INTO payments (booking_id, amount, payment_status) VALUES (?, ?, "PENDING")', [bResult.insertId, calc.totalPrice]);

        res.json({ success: true, booking_id: bResult.insertId, total_price: calc.totalPrice, message: 'Booking request sent to owner!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Get Bookings for Current User (As Renter and As Owner)
app.get('/api/bookings/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    try {
        // As Renter
        const [asRenter] = await pool.query(`
            SELECT b.*, l.model as laptop_model, l.brand, l.pickup_location, l.price_per_day, l.image_url,
                   u.name as owner_name, u.uid as owner_uid, u.email as owner_email,
                   p.payment_status, p.transaction_id
            FROM bookings b
            JOIN laptops l ON b.laptop_id = l.laptop_id
            JOIN users u ON l.owner_id = u.user_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE b.renter_id = ? ORDER BY b.booking_id DESC
        `, [userId]);

        // As Owner (Incoming Requests)
        const [asOwner] = await pool.query(`
            SELECT b.*, l.model as laptop_model, l.brand, l.pickup_location,
                   u.name as renter_name, u.uid as renter_uid, u.email as renter_email, u.phone as renter_phone,
                   p.payment_status
            FROM bookings b
            JOIN laptops l ON b.laptop_id = l.laptop_id
            JOIN users u ON b.renter_id = u.user_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE l.owner_id = ? ORDER BY b.booking_id DESC
        `, [userId]);

        res.json({ success: true, rentals: asRenter, requests: asOwner });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 7. Approve / Reject / Return Booking Actions
app.post('/api/bookings/:id/status', async (req, res) => {
    const { status } = req.body;
    const bookingId = req.params.id;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    try {
        await pool.query('UPDATE bookings SET status = ? WHERE booking_id = ?', [status, bookingId]);
        res.json({ success: true, message: `Booking marked as ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 8. Simulated Demo Payment (Calls Java for transaction ID)
app.post('/api/payments/pay', async (req, res) => {
    const { booking_id } = req.body;
    if (!pool) return res.json({ success: false, message: 'Database disconnected' });

    // Generate transaction reference from Java logic
    const txn = callJavaLogic('txn-id');
    const txnId = txn.transactionId || 'TXN_CU_' + Date.now();

    try {
        await pool.query('UPDATE payments SET payment_status = "PAID", transaction_id = ? WHERE booking_id = ?', [txnId, booking_id]);
        await pool.query('UPDATE bookings SET status = "ACTIVE" WHERE booking_id = ?', [booking_id]);
        res.json({ success: true, transaction_id: txnId, message: 'Demo payment completed successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`============================================================`);
    console.log(` CU LaptopLoop Server running at: http://localhost:${PORT}`);
    console.log(` Open http://localhost:${PORT} in your browser`);
    console.log(`============================================================`);
});
