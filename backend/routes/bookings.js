const express = require('express');
const pool = require('../db');
const router = express.Router();

// Create booking
router.post('/', async (req, res) => {
    const { client_id, therapist_id, booking_date, booking_time, session_type, notes } = req.body;
    
    try {
        const result = await pool.query(`
            INSERT INTO bookings (client_id, therapist_id, booking_date, booking_time, session_type, notes, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING *
        `, [client_id, therapist_id, booking_date, booking_time, session_type, notes]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all bookings (admin)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, 
                   c.full_name as client_name,
                   t.full_name as therapist_name
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

// Get bookings for a therapist
router.get('/therapist/:id', async (req, res) => {
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

// Get bookings for a client
router.get('/client/:id', async (req, res) => {
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
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get upcoming bookings for a therapist
router.get('/therapist/:id/upcoming', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT b.*, u.full_name as client_name
            FROM bookings b
            JOIN users u ON b.client_id = u.user_id
            WHERE b.therapist_id = $1 
            AND b.booking_date >= CURRENT_DATE
            AND b.status IN ('pending', 'confirmed')
            ORDER BY b.booking_date, b.booking_time
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update booking status (confirm, cancel, complete)
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        await pool.query(
            'UPDATE bookings SET status = $1 WHERE booking_id = $2',
            [status, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Reschedule booking
router.put('/:id/reschedule', async (req, res) => {
    const { id } = req.params;
    const { booking_date, booking_time } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE bookings 
            SET booking_date = $1, booking_time = $2, status = 'pending'
            WHERE booking_id = $3
            RETURNING *
        `, [booking_date, booking_time, id]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Add therapist notes to booking
router.put('/:id/notes', async (req, res) => {
    const { id } = req.params;
    const { therapist_notes } = req.body;
    
    try {
        await pool.query(
            'UPDATE bookings SET therapist_notes = $1 WHERE booking_id = $2',
            [therapist_notes, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Add client feedback and rating
router.post('/:id/feedback', async (req, res) => {
    const { id } = req.params;
    const { client_feedback, client_rating } = req.body;
    
    try {
        await pool.query(`
            UPDATE bookings 
            SET client_feedback = $1, client_rating = $2
            WHERE booking_id = $3
        `, [client_feedback, client_rating, id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Mark booking as completed
router.put('/:id/complete', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(
            'UPDATE bookings SET status = $1 WHERE booking_id = $2',
            ['completed', id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Cancel booking with reason
router.put('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    
    try {
        await pool.query(`
            UPDATE bookings 
            SET status = 'cancelled', notes = CONCAT(notes, '\nCancelled: ', $1)
            WHERE booking_id = $2
        `, [cancellation_reason || 'No reason provided', id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;