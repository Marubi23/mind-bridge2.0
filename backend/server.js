const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const pool = require('./db');
require('dotenv').config();

// Import all routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const therapistRoutes = require('./routes/therapists');
const clientRoutes = require('./routes/clients');
const bookingRoutes = require('./routes/bookings');
const messageRoutes = require('./routes/messages');
const videoRoutes = require('./routes/video');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to log activities from frontend
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

// Register all routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/video', videoRoutes);

// ============ ACTIVITY LOGGING ENDPOINTS ============

// Log user activity from frontend
app.post('/api/activity/log', async (req, res) => {
    const { action, details } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const clientIp = getClientIp(req);
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userResult = await pool.query(
            'SELECT full_name, role FROM users WHERE user_id = $1',
            [decoded.userId]
        );
        
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            await logActivity(
                decoded.userId, 
                user.full_name, 
                user.role, 
                action, 
                details,
                clientIp
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error logging activity:', err);
        res.status(500).json({ error: 'Failed to log activity' });
    }
});

// Get activity logs (admin only - already in admin routes, but adding here for completeness)
app.get('/api/activity/logs', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user is admin
        const userResult = await pool.query(
            'SELECT role FROM users WHERE user_id = $1',
            [decoded.userId]
        );
        
        if (userResult.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const result = await pool.query(`
            SELECT log_id, user_name, user_role, action, details, ip_address, created_at
            FROM activity_logs
            ORDER BY created_at DESC
            LIMIT 50
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get activity statistics
app.get('/api/activity/stats', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userResult = await pool.query(
            'SELECT role FROM users WHERE user_id = $1',
            [decoded.userId]
        );
        
        if (userResult.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
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

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        name: 'MindBridge API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            therapists: '/api/therapists',
            clients: '/api/clients',
            bookings: '/api/bookings',
            messages: '/api/messages',
            video: '/api/video',
            activity: {
                log: 'POST /api/activity/log',
                logs: 'GET /api/activity/logs (admin)',
                stats: 'GET /api/activity/stats (admin)'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    MINDBRIDGE API SERVER                    ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Server running on http://localhost:${PORT}              ║
║  📊 API Docs: http://localhost:${PORT}/                     ║
║  📝 Activity Logging: ENABLED                               ║
╠════════════════════════════════════════════════════════════╣
║  🔗 Endpoints:                                              ║
║     POST   /api/auth/login                                  ║
║     POST   /api/auth/register                               ║
║     GET    /api/admin/stats                                 ║
║     GET    /api/admin/therapists                            ║
║     GET    /api/admin/clients                               ║
║     GET    /api/admin/bookings                              ║
║     GET    /api/admin/messages                              ║
║     POST   /api/activity/log                                ║
║     GET    /api/activity/logs                               ║
║     GET    /api/activity/stats                              ║
╚════════════════════════════════════════════════════════════╝
    `);
});