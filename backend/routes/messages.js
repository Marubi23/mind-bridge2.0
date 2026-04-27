const express = require('express');
const pool = require('../db');
const router = express.Router();

// Send message
router.post('/', async (req, res) => {
    const { from_user_id, to_user_id, message, reply_to_id } = req.body;
    
    try {
        // Generate conversation_id - if replying, use same conversation
        let conversationId = req.body.conversation_id;
        
        if (reply_to_id) {
            // Get existing conversation_id from parent message
            const parentMsg = await pool.query(
                'SELECT conversation_id FROM messages WHERE message_id = $1',
                [reply_to_id]
            );
            conversationId = parentMsg.rows[0]?.conversation_id;
        }
        
        if (!conversationId) {
            conversationId = require('crypto').randomUUID();
        }
        
        const result = await pool.query(`
            INSERT INTO messages (from_user_id, to_user_id, message, reply_to_id, conversation_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [from_user_id, to_user_id, message, reply_to_id, conversationId]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Reply to a specific message
router.post('/reply/:messageId', async (req, res) => {
    const { messageId } = req.params;
    const { from_user_id, to_user_id, message } = req.body;
    
    try {
        // Get parent message details
        const parentMsg = await pool.query(
            'SELECT conversation_id, from_user_id, to_user_id FROM messages WHERE message_id = $1',
            [messageId]
        );
        
        if (parentMsg.rows.length === 0) {
            return res.status(404).json({ error: 'Parent message not found' });
        }
        
        const conversationId = parentMsg.rows[0].conversation_id;
        
        // Insert reply
        const result = await pool.query(`
            INSERT INTO messages (from_user_id, to_user_id, message, reply_to_id, conversation_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [from_user_id, to_user_id, message, messageId, conversationId]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get conversation between two users
router.get('/conversation/:userId1/:userId2', async (req, res) => {
    const { userId1, userId2 } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT m.*, 
                   u1.full_name as from_name,
                   u2.full_name as to_name
            FROM messages m
            JOIN users u1 ON m.from_user_id = u1.user_id
            JOIN users u2 ON m.to_user_id = u2.user_id
            WHERE (m.from_user_id = $1 AND m.to_user_id = $2)
               OR (m.from_user_id = $2 AND m.to_user_id = $1)
            ORDER BY m.created_at ASC
        `, [userId1, userId2]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get conversation by conversation_id
router.get('/conversation/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT m.*, 
                   u1.full_name as from_name,
                   u2.full_name as to_name
            FROM messages m
            JOIN users u1 ON m.from_user_id = u1.user_id
            JOIN users u2 ON m.to_user_id = u2.user_id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC
        `, [conversationId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all conversations for a user (grouped by conversation)
router.get('/user/:userId/conversations', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT DISTINCT 
                m.conversation_id,
                CASE 
                    WHEN m.from_user_id = $1 THEN m.to_user_id
                    ELSE m.from_user_id
                END as other_user_id,
                u.full_name as other_user_name,
                u.role as other_user_role,
                (SELECT message FROM messages m2 
                 WHERE m2.conversation_id = m.conversation_id 
                 ORDER BY m2.created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages m2 
                 WHERE m2.conversation_id = m.conversation_id 
                 ORDER BY m2.created_at DESC LIMIT 1) as last_message_time,
                (SELECT COUNT(*) FROM messages m2 
                 WHERE m2.conversation_id = m.conversation_id 
                 AND m2.to_user_id = $1 
                 AND m2.is_read = false) as unread_count
            FROM messages m
            JOIN users u ON (CASE 
                WHEN m.from_user_id = $1 THEN m.to_user_id
                ELSE m.from_user_id
            END) = u.user_id
            WHERE m.from_user_id = $1 OR m.to_user_id = $1
            ORDER BY last_message_time DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get unread messages for a user
router.get('/user/:id/unread', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT m.*, u.full_name as from_name
            FROM messages m
            JOIN users u ON m.from_user_id = u.user_id
            WHERE m.to_user_id = $1 AND m.is_read = false
            ORDER BY m.created_at DESC
        `, [id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query(
            'UPDATE messages SET is_read = true WHERE message_id = $1',
            [id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Mark all messages in conversation as read
router.put('/conversation/:conversationId/read/:userId', async (req, res) => {
    const { conversationId, userId } = req.params;
    
    try {
        await pool.query(`
            UPDATE messages 
            SET is_read = true 
            WHERE conversation_id = $1 AND to_user_id = $2 AND is_read = false
        `, [conversationId, userId]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete message (soft delete for admin)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM messages WHERE message_id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;