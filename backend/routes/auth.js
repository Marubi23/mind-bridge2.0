const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

// Helper function to log activities
async function logActivity(userId, userName, userRole, action, details = null, ipAddress = null) {
    try {
        await pool.query(
            `INSERT INTO activity_logs (user_id, user_name, user_role, action, details, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, userName, userRole, action, details, ipAddress || 'unknown']
        );
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}

// Get client IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
}

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);
    
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            // Log failed login - user not found
            await logActivity(null, email, 'unknown', 'login_failed', 'User not found', clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        // Check if account is suspended
        if (user.suspended_at) {
            await logActivity(user.user_id, user.full_name, user.role, 'login_failed', 'Account suspended', clientIp);
            return res.status(403).json({ error: 'Account suspended. Please contact support.' });
        }
        
        // For demo - compare plain text (use bcrypt in production)
        if (password !== user.password_hash) {
            // Log failed login - wrong password
            await logActivity(user.user_id, user.full_name, user.role, 'login_failed', 'Invalid password', clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Update last login timestamp
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
            [user.user_id]
        );
        
        // LOG SUCCESSFUL LOGIN ACTIVITY
        await logActivity(
            user.user_id,
            user.full_name,
            user.role,
            'login',
            `User logged in successfully from IP: ${clientIp}`,
            clientIp
        );
        
        res.json({
            token,
            user: {
                id: user.user_id,
                email: user.email,
                name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Register
router.post('/register', async (req, res) => {
    const { email, password, full_name, role, license_number, specialization, phone_number } = req.body;
    const clientIp = getClientIp(req);
    
    try {
        // Check if email already exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Insert user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, created_at) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
            [email, password, full_name, role]
        );
        
        const user = result.rows[0];
        
        // If role is therapist, add to therapist_profiles
        if (role === 'therapist') {
            await pool.query(
                `INSERT INTO therapist_profiles (therapist_id, license_number, specialization, approval_status)
                 VALUES ($1, $2, $3, 'pending')`,
                [user.user_id, license_number || null, specialization || null]
            );
        }
        
        // If role is client, add to client_profiles
        if (role === 'client') {
            await pool.query(
                `INSERT INTO client_profiles (client_id, phone_number)
                 VALUES ($1, $2)`,
                [user.user_id, phone_number || null]
            );
        }
        
        // LOG REGISTRATION ACTIVITY
        await logActivity(
            user.user_id,
            user.full_name,
            user.role,
            'register',
            `New ${role} account created`,
            clientIp
        );
        
        res.json({ 
            success: true, 
            message: 'Account created successfully',
            user: {
                id: user.user_id,
                email: user.email,
                name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Logout (optional - just for logging purposes)
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const clientIp = getClientIp(req);
    
    try {
        // You can't invalidate JWT, but you can log the logout attempt
        // In production, you might want to maintain a blacklist
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT user_id, email, full_name, role, is_active, created_at, last_login FROM users WHERE user_id = $1',
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;