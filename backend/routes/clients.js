const express = require('express');
const pool = require('../db');
const router = express.Router();

// Get client dashboard data
router.get('/:id/dashboard', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get client's bookings
        const bookings = await pool.query(`
            SELECT b.*, u.full_name as therapist_name, tp.specialization
            FROM bookings b
            JOIN users u ON b.therapist_id = u.user_id
            JOIN therapist_profiles tp ON u.user_id = tp.therapist_id
            WHERE b.client_id = $1
            ORDER BY b.booking_date DESC
        `, [id]);
        
        // Get client's messages
        const messages = await pool.query(`
            SELECT m.*, u.full_name as from_name
            FROM messages m
            JOIN users u ON m.from_user_id = u.user_id
            WHERE m.to_user_id = $1 OR m.from_user_id = $1
            ORDER BY m.created_at DESC
            LIMIT 10
        `, [id]);
        
        // Get client's therapists
        const therapists = await pool.query(`
            SELECT DISTINCT u.user_id, u.full_name, tp.specialization, tp.profile_image
            FROM users u
            JOIN therapist_profiles tp ON u.user_id = tp.therapist_id
            JOIN bookings b ON u.user_id = b.therapist_id
            WHERE b.client_id = $1
        `, [id]);
        
        res.json({
            bookings: bookings.rows,
            messages: messages.rows,
            unread_count: messages.rows.filter(m => !m.is_read && m.to_user_id === parseInt(id)).length,
            therapists: therapists.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get client's bookings
router.get('/:id/bookings', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT b.*, u.full_name as therapist_name, tp.specialization
            FROM bookings b
            JOIN users u ON b.therapist_id = u.user_id
            JOIN therapist_profiles tp ON u.user_id = tp.therapist_id
            WHERE b.client_id = $1
            ORDER BY b.booking_date DESC
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;