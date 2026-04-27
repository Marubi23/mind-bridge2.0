const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get system stats
router.get('/stats', async (req, res) => {
    try {
        const totalTherapists = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'therapist' AND (suspended_at IS NULL) AND is_active = true");
        const totalClients = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client' AND (suspended_at IS NULL) AND is_active = true");
        const totalBookings = await pool.query("SELECT COUNT(*) FROM bookings");
        const unreadMessages = await pool.query("SELECT COUNT(*) FROM messages WHERE is_read = false");
        const pendingTherapists = await pool.query("SELECT COUNT(*) FROM therapist_profiles WHERE approval_status = 'pending'");
        
        res.json({
            total_therapists: parseInt(totalTherapists.rows[0].count),
            total_clients: parseInt(totalClients.rows[0].count),
            total_bookings: parseInt(totalBookings.rows[0].count),
            unread_messages: parseInt(unreadMessages.rows[0].count),
            pending_therapists: parseInt(pendingTherapists.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all therapists (with approval status)
router.get('/therapists', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.full_name, u.email, u.is_active, u.created_at,
                   tp.specialization, tp.hourly_rate, tp.is_available, 
                   tp.approval_status, tp.license_number, tp.years_experience,
                   u.suspended_at, tp.verified_at
            FROM users u
            JOIN therapist_profiles tp ON u.user_id = tp.therapist_id
            WHERE u.role = 'therapist'
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get pending therapists count
router.get('/therapists/pending/count', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*) FROM therapist_profiles WHERE approval_status = 'pending'"
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Approve a therapist
router.put('/therapists/:id/approve', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(`
            UPDATE therapist_profiles 
            SET approval_status = 'approved', verified_at = CURRENT_TIMESTAMP
            WHERE therapist_id = $1
        `, [id]);
        
        res.json({ success: true, message: 'Therapist approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Reject a therapist
router.put('/therapists/:id/reject', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        await pool.query(`
            UPDATE therapist_profiles 
            SET approval_status = 'rejected'
            WHERE therapist_id = $1
        `, [id]);
        
        res.json({ success: true, message: 'Therapist rejected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all clients
router.get('/clients', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.full_name, u.email, u.is_active, u.created_at,
                   cp.phone_number, cp.emergency_contact, cp.total_sessions,
                   u.suspended_at
            FROM users u
            LEFT JOIN client_profiles cp ON u.user_id = cp.client_id
            WHERE u.role = 'client'
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all bookings (with details)
router.get('/bookings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.booking_id, b.booking_date, b.booking_time, b.status, b.session_type, b.created_at,
                   c.full_name as client_name, c.email as client_email,
                   t.full_name as therapist_name, t.email as therapist_email
            FROM bookings b
            JOIN users c ON b.client_id = c.user_id
            JOIN users t ON b.therapist_id = t.user_id
            ORDER BY b.booking_date DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all messages (admin view) - WITH USER IDs
router.get('/messages', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.message_id, m.message, m.is_read, m.created_at,
                   u1.full_name as from_name, u1.user_id as from_user_id,
                   u2.full_name as to_name, u2.user_id as to_user_id
            FROM messages m
            JOIN users u1 ON m.from_user_id = u1.user_id
            JOIN users u2 ON m.to_user_id = u2.user_id
            ORDER BY m.created_at DESC
            LIMIT 200
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ ACTIVITY LOGS (Admin Only) ============

// Get activity logs
router.get('/activity/logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT log_id, user_name, user_role, action, details, ip_address, created_at
            FROM activity_logs
            ORDER BY created_at DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get activity statistics
router.get('/activity/stats', async (req, res) => {
    try {
        const today = await pool.query(`
            SELECT COUNT(*) FROM activity_logs 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        const thisWeek = await pool.query(`
            SELECT COUNT(*) FROM activity_logs 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        
        const topUsers = await pool.query(`
            SELECT user_name, user_role, COUNT(*) as activity_count
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY user_name, user_role
            ORDER BY activity_count DESC
            LIMIT 5
        `);
        
        const recentActions = await pool.query(`
            SELECT action, COUNT(*) as count
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
        `);
        
        res.json({
            today_activities: parseInt(today.rows[0].count),
            week_activities: parseInt(thisWeek.rows[0].count),
            top_users: topUsers.rows,
            recent_actions: recentActions.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ USER MANAGEMENT ============

// Suspend a user (therapist or client)
router.put('/users/:id/suspend', async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    try {
        await pool.query(`
            UPDATE users 
            SET suspended_at = CURRENT_TIMESTAMP, suspension_reason = $1
            WHERE user_id = $2
        `, [reason || 'No reason provided', id]);
        
        res.json({ success: true, message: 'User suspended successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Unsuspend a user
router.put('/users/:id/unsuspend', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(`
            UPDATE users 
            SET suspended_at = NULL, suspension_reason = NULL
            WHERE user_id = $1
        `, [id]);
        
        res.json({ success: true, message: 'User unsuspended successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete user (soft delete - set inactive)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(
            'UPDATE users SET is_active = false WHERE user_id = $1',
            [id]
        );
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Toggle therapist availability
router.put('/therapists/:id/status', async (req, res) => {
    const { id } = req.params;
    const { is_available } = req.body;
    
    try {
        await pool.query(`
            UPDATE therapist_profiles 
            SET is_available = $1
            WHERE therapist_id = $2
        `, [is_available, id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get recent activity (legacy - kept for compatibility)
router.get('/activity', async (req, res) => {
    try {
        const recentBookings = await pool.query(`
            SELECT 'booking' as type, b.created_at, 
                   c.full_name as client, t.full_name as therapist
            FROM bookings b
            JOIN users c ON b.client_id = c.user_id
            JOIN users t ON b.therapist_id = t.user_id
            ORDER BY b.created_at DESC LIMIT 10
        `);
        
        const recentMessages = await pool.query(`
            SELECT 'message' as type, m.created_at,
                   u1.full_name as from_user, u2.full_name as to_user
            FROM messages m
            JOIN users u1 ON m.from_user_id = u1.user_id
            JOIN users u2 ON m.to_user_id = u2.user_id
            ORDER BY m.created_at DESC LIMIT 10
        `);
        
        const newUsers = await pool.query(`
            SELECT 'user' as type, created_at, full_name, role
            FROM users
            ORDER BY created_at DESC LIMIT 10
        `);
        
        const activities = [...recentBookings.rows, ...recentMessages.rows, ...newUsers.rows]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 20);
        
        res.json(activities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;