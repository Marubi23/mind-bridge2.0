// ============ API HELPER ============
const API_URL = 'http://localhost:3000/api';

// Generic API caller with authentication
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API call failed');
        }
        
        return response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// ============ AUTHENTICATION ============
async function login(email, password) {
    const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    window.location.href = 'login.html';
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// ============ ADMIN API ============
async function getAdminStats() {
    return apiCall('/admin/stats');
}

async function getAllTherapists() {
    return apiCall('/admin/therapists');
}

async function getAllClients() {
    return apiCall('/admin/clients');
}

async function getAllBookings() {
    return apiCall('/admin/bookings');
}

async function getAllMessages() {
    return apiCall('/admin/messages');
}

async function approveTherapist(therapistId) {
    return apiCall(`/admin/therapists/${therapistId}/approve`, { method: 'PUT' });
}

async function rejectTherapist(therapistId) {
    return apiCall(`/admin/therapists/${therapistId}/reject`, { method: 'PUT' });
}

async function suspendUser(userId, reason) {
    return apiCall(`/admin/users/${userId}/suspend`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
    });
}

async function unsuspendUser(userId) {
    return apiCall(`/admin/users/${userId}/unsuspend`, { method: 'PUT' });
}

async function deleteUser(userId) {
    return apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
}

async function toggleTherapistStatus(therapistId, isAvailable) {
    return apiCall(`/admin/therapists/${therapistId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_available: isAvailable })
    });
}

async function getAdminActivity() {
    return apiCall('/admin/activity');
}

// ============ THERAPIST API ============
async function getPublicTherapists() {
    return apiCall('/therapists');
}

async function getTherapistById(therapistId) {
    return apiCall(`/therapists/${therapistId}`);
}

async function getTherapistDashboard(therapistId) {
    return apiCall(`/therapists/${therapistId}/dashboard`);
}

async function getTherapistBookings(therapistId) {
    return apiCall(`/therapists/${therapistId}/bookings`);
}

async function getTherapistUpcomingBookings(therapistId) {
    return apiCall(`/therapists/${therapistId}/upcoming`);
}

async function getTherapistClients(therapistId) {
    return apiCall(`/therapists/${therapistId}/clients`);
}

// ============ CLIENT API ============
async function getClientDashboard(clientId) {
    return apiCall(`/clients/${clientId}/dashboard`);
}

async function getClientBookings(clientId) {
    return apiCall(`/clients/${clientId}/bookings`);
}

async function getClientUpcomingBookings(clientId) {
    return apiCall(`/clients/${clientId}/upcoming`);
}

async function updateClientProfile(clientId, profileData) {
    return apiCall(`/clients/${clientId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
}

async function getClientProfile(clientId) {
    return apiCall(`/clients/${clientId}/profile`);
}

// ============ BOOKINGS API ============
async function createBooking(bookingData) {
    return apiCall('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
    });
}

async function updateBookingStatus(bookingId, status) {
    return apiCall(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });
}

async function rescheduleBooking(bookingId, newDate, newTime) {
    return apiCall(`/bookings/${bookingId}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({ booking_date: newDate, booking_time: newTime })
    });
}

async function cancelBooking(bookingId, reason) {
    return apiCall(`/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ cancellation_reason: reason })
    });
}

async function addTherapistNotes(bookingId, notes) {
    return apiCall(`/bookings/${bookingId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ therapist_notes: notes })
    });
}

async function addClientFeedback(bookingId, feedback, rating) {
    return apiCall(`/bookings/${bookingId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ client_feedback: feedback, client_rating: rating })
    });
}

async function completeBooking(bookingId) {
    return apiCall(`/bookings/${bookingId}/complete`, { method: 'PUT' });
}

async function getBookingDetails(bookingId) {
    return apiCall(`/bookings/${bookingId}`);
}

// ============ MESSAGES API ============
async function sendMessage(fromUserId, toUserId, message) {
    return apiCall('/messages', {
        method: 'POST',
        body: JSON.stringify({ from_user_id: fromUserId, to_user_id: toUserId, message })
    });
}

async function replyToMessage(messageId, fromUserId, toUserId, message) {
    return apiCall(`/messages/reply/${messageId}`, {
        method: 'POST',
        body: JSON.stringify({ from_user_id: fromUserId, to_user_id: toUserId, message })
    });
}

async function getConversation(userId1, userId2) {
    return apiCall(`/messages/conversation/${userId1}/${userId2}`);
}

async function getUserConversations(userId) {
    return apiCall(`/messages/user/${userId}/conversations`);
}

async function getUnreadMessages(userId) {
    return apiCall(`/messages/user/${userId}/unread`);
}

async function markMessageRead(messageId) {
    return apiCall(`/messages/${messageId}/read`, { method: 'PUT' });
}

async function markConversationRead(conversationId, userId) {
    return apiCall(`/messages/conversation/${conversationId}/read/${userId}`, { method: 'PUT' });
}

async function deleteMessage(messageId) {
    return apiCall(`/messages/${messageId}`, { method: 'DELETE' });
}

async function getMessageById(messageId) {
    return apiCall(`/messages/${messageId}`);
}

// ============ VIDEO API ============
async function createVideoSession(bookingId, therapistId, clientId) {
    return apiCall('/video/create', {
        method: 'POST',
        body: JSON.stringify({ booking_id: bookingId, therapist_id: therapistId, client_id: clientId })
    });
}

async function startVideoSession(sessionId) {
    return apiCall(`/video/${sessionId}/start`, { method: 'PUT' });
}

async function endVideoSession(sessionId) {
    return apiCall(`/video/${sessionId}/end`, { method: 'PUT' });
}

async function getVideoSessionByBooking(bookingId) {
    return apiCall(`/video/booking/${bookingId}`);
}

async function getVideoSessionByRoom(roomName) {
    return apiCall(`/video/room/${roomName}`);
}

async function getActiveSessionsForTherapist(therapistId) {
    return apiCall(`/video/therapist/${therapistId}/active`);
}

async function validateVideoRoom(roomName, userId) {
    return apiCall(`/video/validate/${roomName}/${userId}`);
}

// ============ DASHBOARD STATS API ============
async function getSystemStats() {
    return apiCall('/admin/stats');
}

async function getRecentActivity() {
    return apiCall('/admin/activity');
}

// ============ NOTIFICATION API (Future) ============
async function getNotifications(userId) {
    return apiCall(`/notifications/${userId}`);
}

async function markNotificationRead(notificationId) {
    return apiCall(`/notifications/${notificationId}/read`, { method: 'PUT' });
}
// ============ ACTIVITY LOGS API ============
async function getActivityLogs() {
    return apiCall('/admin/activity/logs');
}

async function getActivityStats() {
    return apiCall('/admin/activity/stats');
}