// Therapist Dashboard - Complete Version
let therapistId = null;
let currentConversationId = null;

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    
    if (!token || user?.role !== 'therapist') {
        window.location.href = '../login.html';
    }
    
    therapistId = user.id;
    document.getElementById('therapistName').textContent = user.full_name || 'Therapist';
    document.getElementById('welcomeName').textContent = user.full_name?.split(' ')[0] || 'Therapist';
}

// Load dashboard data
async function loadDashboard() {
    try {
        const data = await getTherapistDashboard(therapistId);
        
        // Update stats
        document.getElementById('unreadCount').textContent = data.unread_count || 0;
        document.getElementById('upcomingCount').textContent = data.upcoming_count || 0;
        document.getElementById('clientCount').textContent = data.clients?.length || 0;
        document.getElementById('activeSessions').textContent = data.active_sessions?.length || 0;
        document.getElementById('unreadBadge').textContent = data.unread_count || 0;
        
        // Load messages
        loadMessages();
        
        // Load bookings
        loadBookings();
        
        // Load clients
        loadClients();
        
        // Load video sessions
        loadVideoSessions();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load messages
async function loadMessages() {
    try {
        const conversations = await getUserConversations(therapistId);
        const messagesDiv = document.getElementById('messagesList');
        
        if (!messagesDiv) return;
        
        if (conversations.length === 0) {
            messagesDiv.innerHTML = '<div class="empty-state"><i class="fas fa-envelope"></i><p>No messages yet</p></div>';
            return;
        }
        
        messagesDiv.innerHTML = conversations.map(conv => `
            <div class="message-card ${conv.unread_count > 0 ? 'unread' : ''}" 
                 onclick="openConversation(${conv.other_user_id}, '${conv.conversation_id}')">
                <div class="message-header">
                    <strong>${conv.other_user_name}</strong>
                    <small>${formatTime(conv.last_message_time)}</small>
                </div>
                <p>${conv.last_message?.substring(0, 100) || 'No messages'}</p>
                ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count} new</span>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Open conversation with client
async function openConversation(clientId, conversationId) {
    currentConversationId = conversationId;
    
    try {
        // Mark conversation as read
        await markConversationRead(conversationId, therapistId);
        
        // Get conversation history
        const messages = await getConversation(therapistId, clientId);
        
        // Get client info
        const client = await getTherapistById(clientId);
        
        // Show modal with conversation
        showChatModal(clientId, client.full_name, messages);
        
        // Refresh unread count
        loadDashboard();
        
    } catch (error) {
        console.error('Error opening conversation:', error);
    }
}

// Show chat modal
function showChatModal(clientId, clientName, messages) {
    // Create modal if doesn't exist
    let modal = document.getElementById('chatModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chatModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Chat with <span id="chatClientName"></span></h3>
                    <button class="close-modal" onclick="closeChatModal()">&times;</button>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-input">
                    <textarea id="chatMessageInput" placeholder="Type your message..." rows="3"></textarea>
                    <button onclick="sendReply()" class="btn-send">Send</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('chatClientName').textContent = clientName;
    const messagesDiv = document.getElementById('chatMessages');
    
    messagesDiv.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.from_user_id === therapistId ? 'sent' : 'received'}">
            <div class="message-bubble">
                <p>${escapeHtml(msg.message)}</p>
                <small>${formatTime(msg.created_at)}</small>
            </div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
    document.getElementById('chatMessageInput').focus();
    scrollToBottom();
}

// Send reply
async function sendReply() {
    const messageInput = document.getElementById('chatMessageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    try {
        // Get the other user ID from the modal
        const clientName = document.getElementById('chatClientName').textContent;
        const client = await getTherapistByEmailOrName(clientName);
        
        await sendMessage(therapistId, client.user_id, message);
        
        messageInput.value = '';
        
        // Refresh conversation
        const messages = await getConversation(therapistId, client.user_id);
        const messagesDiv = document.getElementById('chatMessages');
        
        messagesDiv.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.from_user_id === therapistId ? 'sent' : 'received'}">
                <div class="message-bubble">
                    <p>${escapeHtml(msg.message)}</p>
                    <small>${formatTime(msg.created_at)}</small>
                </div>
            </div>
        `).join('');
        
        scrollToBottom();
        
    } catch (error) {
        console.error('Error sending reply:', error);
        showNotification('Failed to send message', 'error');
    }
}

// Load upcoming bookings
async function loadBookings() {
    try {
        const bookings = await getTherapistBookings(therapistId);
        const upcomingBookings = bookings.filter(b => 
            b.status === 'pending' || b.status === 'confirmed'
        );
        
        const bookingsDiv = document.getElementById('bookingsList');
        
        if (!bookingsDiv) return;
        
        if (upcomingBookings.length === 0) {
            bookingsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-calendar"></i><p>No upcoming bookings</p></div>';
            return;
        }
        
        bookingsDiv.innerHTML = upcomingBookings.map(booking => `
            <div class="booking-card">
                <div class="booking-info">
                    <strong>${booking.client_name}</strong>
                    <p>${new Date(booking.booking_date).toLocaleDateString()} at ${booking.booking_time}</p>
                    <span class="status-badge ${booking.status}">${booking.status}</span>
                </div>
                <div class="booking-actions">
                    ${booking.status === 'pending' ? `
                        <button onclick="confirmBooking(${booking.booking_id})" class="btn-confirm">Confirm</button>
                        <button onclick="declineBooking(${booking.booking_id})" class="btn-decline">Decline</button>
                    ` : ''}
                    <button onclick="startVideoSessionForBooking(${booking.booking_id}, ${booking.client_id})" class="btn-video">
                        <i class="fas fa-video"></i> Start Session
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Confirm booking
async function confirmBooking(bookingId) {
    try {
        await updateBookingStatus(bookingId, 'confirmed');
        showNotification('Booking confirmed!', 'success');
        loadBookings();
        loadDashboard();
    } catch (error) {
        console.error('Error confirming booking:', error);
        showNotification('Failed to confirm booking', 'error');
    }
}

// Decline booking
async function declineBooking(bookingId) {
    if (confirm('Are you sure you want to decline this booking?')) {
        try {
            await updateBookingStatus(bookingId, 'cancelled');
            showNotification('Booking declined', 'success');
            loadBookings();
            loadDashboard();
        } catch (error) {
            console.error('Error declining booking:', error);
            showNotification('Failed to decline booking', 'error');
        }
    }
}

// Start video session
async function startVideoSessionForBooking(bookingId, clientId) {
    try {
        // Create or get video session
        const session = await createVideoSession(bookingId, therapistId, clientId);
        
        // Start the session
        await startVideoSession(session.session_id);
        
        // Redirect to video call
        window.location.href = `/video-call.html?room=${session.room_name}&booking=${bookingId}&role=therapist`;
        
    } catch (error) {
        console.error('Error starting video session:', error);
        showNotification('Failed to start video session', 'error');
    }
}

// Load clients list
async function loadClients() {
    try {
        const bookings = await getTherapistBookings(therapistId);
        const uniqueClients = [];
        const clientMap = new Map();
        
        bookings.forEach(booking => {
            if (!clientMap.has(booking.client_id)) {
                clientMap.set(booking.client_id, {
                    id: booking.client_id,
                    name: booking.client_name,
                    email: booking.client_email,
                    sessions: 1
                });
            } else {
                clientMap.get(booking.client_id).sessions++;
            }
        });
        
        const clients = Array.from(clientMap.values());
        const clientsDiv = document.getElementById('clientsList');
        
        if (!clientsDiv) return;
        
        if (clients.length === 0) {
            clientsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No clients yet</p></div>';
            return;
        }
        
        clientsDiv.innerHTML = clients.map(client => `
            <div class="client-card">
                <i class="fas fa-user-circle"></i>
                <div class="client-info">
                    <h4>${client.name}</h4>
                    <p>${client.email}</p>
                    <p class="session-count">${client.sessions} session(s)</p>
                </div>
                <div class="client-actions">
                    <button onclick="openConversation(${client.id})" class="btn-message">
                        <i class="fas fa-comment"></i> Message
                    </button>
                    <button onclick="viewClientBookings(${client.id})" class="btn-view">
                        <i class="fas fa-calendar"></i> History
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

// Load video sessions
async function loadVideoSessions() {
    try {
        const sessions = await getActiveSessionsForTherapist(therapistId);
        const sessionsDiv = document.getElementById('sessionsList');
        
        if (!sessionsDiv) return;
        
        if (sessions.length === 0) {
            sessionsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><p>No active video sessions</p></div>';
            return;
        }
        
        sessionsDiv.innerHTML = sessions.map(session => `
            <div class="session-card">
                <i class="fas fa-video"></i>
                <div class="session-info">
                    <h4>Session with ${session.client_name}</h4>
                    <p>Started: ${formatTime(session.started_at)}</p>
                    <p>Room: ${session.room_name}</p>
                </div>
                <button onclick="joinVideoSession('${session.room_name}')" class="btn-join">
                    <i class="fas fa-sign-in-alt"></i> Join Now
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading video sessions:', error);
    }
}

function joinVideoSession(roomName) {
    window.location.href = `/video-call.html?room=${roomName}&role=therapist`;
}

function viewClientBookings(clientId) {
    window.location.href = `client-bookings.html?client=${clientId}`;
}

// Helper functions
function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const messagesDiv = document.getElementById('chatMessages');
    if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function closeChatModal() {
    const modal = document.getElementById('chatModal');
    if (modal) modal.style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Helper to get therapist by name
async function getTherapistByEmailOrName(name) {
    const therapists = await getPublicTherapists();
    return therapists.find(t => t.full_name === name);
}

// Tab navigation
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;
        
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        item.classList.add('active');
        document.getElementById(tab).classList.add('active');
        
        if (tab === 'messages') loadMessages();
        if (tab === 'bookings') loadBookings();
        if (tab === 'clients') loadClients();
        if (tab === 'sessions') loadVideoSessions();
    });
});

// Initialize
checkAuth();
loadDashboard();