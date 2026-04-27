const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get all therapists (public)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.full_name, u.email, 
                   tp.specialization, tp.bio, tp.hourly_rate, 
                   tp.years_experience, tp.is_available, tp.profile_image
            FROM users u
            JOIN therapist_profiles tp ON u.user_id = tp.therapist_id
            WHERE u.role = 'therapist' 
              AND u.is_active = true 
              AND u.suspended_at IS NULL
              AND tp.approval_status = 'approved'
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get single therapist by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.full_name, u.email, 
                   tp.specialization, tp.bio, tp.hourly_rate, 
                   tp.years_experience, tp.is_available,
                   tp.profile_image, tp.license_number
            FROM users u
            JOIN therapist_profiles tp ON u.user_id = tp.therapist_id
            WHERE u.user_id = $1 AND u.role = 'therapist'
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Therapist not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get therapist dashboard data
router.get('/:id/dashboard', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Unread messages
        const unreadMessages = await pool.query(`
            SELECT m.*, u.full_name as from_name
            FROM messages m
            JOIN users u ON m.from_user_id = u.user_id
            WHERE m.to_user_id = $1 AND m.is_read = false
            ORDER BY m.created_at DESC
        `, [id]);
        
        // Upcoming bookings
        const upcomingBookings = await pool.query(`
            SELECT b.*, u.full_name as client_name
            FROM bookings b
            JOIN users u ON b.client_id = u.user_id
            WHERE b.therapist_id = $1 
            AND b.booking_date >= CURRENT_DATE
            AND b.status IN ('pending', 'confirmed')
            ORDER BY b.booking_date, b.booking_time
        `, [id]);
        
        // Client list
        const clients = await pool.query(`
            SELECT DISTINCT u.user_id, u.full_name, u.email, cp.phone_number
            FROM users u
            JOIN bookings b ON u.user_id = b.client_id
            LEFT JOIN client_profiles cp ON u.user_id = cp.client_id
            WHERE b.therapist_id = $1
        `, [id]);
        
        // Active video sessions
        const activeSessions = await pool.query(`
            SELECT vs.*, u.full_name as client_name
            FROM video_sessions vs
            JOIN bookings b ON vs.booking_id = b.booking_id
            JOIN users u ON b.client_id = u.user_id
            WHERE b.therapist_id = $1 AND vs.status = 'active'
        `, [id]);
        
        res.json({
            unread_messages: unreadMessages.rows,
            unread_count: unreadMessages.rows.length,
            upcoming_bookings: upcomingBookings.rows,
            upcoming_count: upcomingBookings.rows.length,
            clients: clients.rows,
            active_sessions: activeSessions.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get therapist bookings
router.get('/:id/bookings', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT b.*, u.full_name as client_name, u.email as client_email
            FROM bookings b
            JOIN users u ON b.client_id = u.user_id
            WHERE b.therapist_id = $1
            ORDER BY b.booking_date DESC
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;