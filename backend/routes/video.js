const express = require('express');
const pool = require('../db');
const router = express.Router();
const crypto = require('crypto');

// Generate unique room name
function generateRoomName() {
    return crypto.randomBytes(16).toString('hex');
}

// Create video session for a booking
router.post('/create', async (req, res) => {
    const { booking_id, therapist_id, client_id } = req.body;
    
    try {
        // Check if session already exists
        const existing = await pool.query(
            'SELECT * FROM video_sessions WHERE booking_id = $1',
            [booking_id]
        );
        
        if (existing.rows.length > 0) {
            return res.json(existing.rows[0]);
        }
        
        const roomName = generateRoomName();
        
        const result = await pool.query(`
            INSERT INTO video_sessions (booking_id, room_name, status)
            VALUES ($1, $2, 'scheduled')
            RETURNING *
        `, [booking_id, roomName]);
        
        res.json({
            ...result.rows[0],
            join_url: `/video-call.html?room=${roomName}&booking=${booking_id}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get session by booking ID
router.get('/booking/:booking_id', async (req, res) => {
    const { booking_id } = req.params;
    
    try {
        const result = await pool.query(
            'SELECT * FROM video_sessions WHERE booking_id = $1',
            [booking_id]
        );
        
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get session by room name
router.get('/room/:room_name', async (req, res) => {
    const { room_name } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT vs.*, b.therapist_id, b.client_id,
                   t.full_name as therapist_name,
                   c.full_name as client_name
            FROM video_sessions vs
            JOIN bookings b ON vs.booking_id = b.booking_id
            JOIN users t ON b.therapist_id = t.user_id
            JOIN users c ON b.client_id = c.user_id
            WHERE vs.room_name = $1
        `, [room_name]);
        
        res.json(result.rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Start video session
router.put('/:id/start', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(`
            UPDATE video_sessions 
            SET started_at = CURRENT_TIMESTAMP, status = 'active'
            WHERE session_id = $1
        `, [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// End video session
router.put('/:id/end', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(`
            UPDATE video_sessions 
            SET ended_at = CURRENT_TIMESTAMP, status = 'ended'
            WHERE session_id = $1
        `, [id]);
        
        // Also mark booking as completed if session ended
        await pool.query(`
            UPDATE bookings 
            SET status = 'completed' 
            WHERE booking_id = (SELECT booking_id FROM video_sessions WHERE session_id = $1)
        `, [id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get active sessions for a therapist
router.get('/therapist/:therapist_id/active', async (req, res) => {
    const { therapist_id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT vs.*, b.client_id, u.full_name as client_name
            FROM video_sessions vs
            JOIN bookings b ON vs.booking_id = b.booking_id
            JOIN users u ON b.client_id = u.user_id
            WHERE b.therapist_id = $1 AND vs.status = 'active'
        `, [therapist_id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Validate room access (check if user is authorized)
router.get('/validate/:room_name/:user_id', async (req, res) => {
    const { room_name, user_id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT vs.*, b.therapist_id, b.client_id
            FROM video_sessions vs
            JOIN bookings b ON vs.booking_id = b.booking_id
            WHERE vs.room_name = $1
        `, [room_name]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        const session = result.rows[0];
        const isAuthorized = (session.therapist_id == user_id || session.client_id == user_id);
        
        res.json({ authorized: isAuthorized, session });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;