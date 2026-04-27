// Client Dashboard - Complete Version
let clientId = null;
let currentConversationId = null;
let currentTherapistId = null;

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    
    if (!token || user?.role !== 'client') {
        window.location.href = '../login.html';
    }
    
    clientId = user.id;
    document.getElementById('clientName').textContent = user.full_name || 'Client';
    document.getElementById('welcomeClientName').textContent = user.full_name?.split(' ')[0] || 'Client';
    document.getElementById('profileFullName').value = user.full_name || '';
    document.getElementById('profileEmail').value = user.email || '';
}

// Load dashboard data
async function loadClientDashboard() {
    try {
        const data = await getClientDashboard(clientId);
        
        // Calculate stats
        const upcoming = data.bookings?.filter(b => 
            (b.status === 'confirmed' || b.status === 'pending') && 
            new Date(b.booking_date) >= new Date()
        ) || [];
        
        const completed = data.bookings?.filter(b => b.status === 'completed') || [];
        const uniqueTherapists = new Set(data.bookings?.map(b => b.therapist_name));
        
        // Update stats
        document.getElementById('upcomingAppointments').textContent = upcoming.length;
        document.getElementById('therapistsCount').textContent = uniqueTherapists.size;
        document.getElementById('clientUnreadCount').textContent = data.unread_count || 0;
        document.getElementById('completedSessions').textContent = completed.length;
        document.getElementById('clientUnreadBadge').textContent = data.unread_count || 0;
        
        // Load upcoming appointments
        loadUpcomingAppointments(upcoming);
        
        // Load all appointments
        loadAllAppointments(data.bookings || []);
        
        // Load therapists
        loadMyTherapists(data.therapists || []);
        
        // Load messages
        loadClientMessages();
        
        // Load profile
        loadClientProfile();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load upcoming appointments
function loadUpcomingAppointments(upcoming) {
    const upcomingDiv = document.getElementById('upcomingAppointmentsList');
    if (!upcomingDiv) return;
    
    if (upcoming.length === 0) {
        upcomingDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <p>No upcoming appointments. <a href="../therapists.html">Book a session</a></p>
            </div>`;
        return;
    }
    
    upcomingDiv.innerHTML = upcoming.map(booking => `
        <div class="appointment-card">
            <div class="appointment-info">
                <h4>Session with ${booking.therapist_name}</h4>
                <p><i class="fas fa-calendar"></i> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><i class="fas fa-clock"></i> ${booking.booking_time}</p>
                <p><i class="fas fa-tag"></i> ${booking.specialization || 'Therapy Session'}</p>
                <span class="status ${booking.status}">${booking.status}</span>
            </div>
            <div class="appointment-actions">
                ${booking.status === 'confirmed' ? `
                    <button onclick="joinVideoSessionForBooking(${booking.booking_id})" class="btn-video">
                        <i class="fas fa-video"></i> Join Session
                    </button>
                ` : ''}
                <button onclick="rescheduleBooking(${booking.booking_id})" class="btn-reschedule">
                    <i class="fas fa-calendar-alt"></i> Reschedule
                </button>
                <button onclick="cancelClientBooking(${booking.booking_id})" class="btn-cancel">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `).join('');
}

// Load all appointments
function loadAllAppointments(bookings) {
    const allAppointmentsDiv = document.getElementById('allAppointmentsList');
    if (!allAppointmentsDiv) return;
    
    if (bookings.length === 0) {
        allAppointmentsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <p>No appointments yet. <a href="../therapists.html">Book your first session</a></p>
            </div>`;
        return;
    }
    
    allAppointmentsDiv.innerHTML = bookings.map(booking => `
        <div class="appointment-card">
            <div class="appointment-info">
                <h4>Session with ${booking.therapist_name}</h4>
                <p><i class="fas fa-calendar"></i> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><i class="fas fa-clock"></i> ${booking.booking_time}</p>
                <p><i class="fas fa-tag"></i> ${booking.specialization || 'Therapy Session'}</p>
                <span class="status ${booking.status}">${booking.status}</span>
                ${booking.status === 'completed' && !booking.client_rating ? `
                    <button onclick="rateSession(${booking.booking_id})" class="btn-rate">
                        <i class="fas fa-star"></i> Rate Session
                    </button>
                ` : ''}
                ${booking.client_rating ? `
                    <div class="rating-display">
                        ${'★'.repeat(booking.client_rating)}${'☆'.repeat(5 - booking.client_rating)}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Load my therapists
function loadMyTherapists(therapists) {
    const therapistsDiv = document.getElementById('myTherapistsList');
    if (!therapistsDiv) return;
    
    if (therapists.length === 0) {
        therapistsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-md"></i>
                <p>You haven't booked with any therapists yet. <a href="../therapists.html">Find a therapist</a></p>
            </div>`;
        return;
    }
    
    therapistsDiv.innerHTML = therapists.map(therapist => `
        <div class="therapist-card-small">
            <i class="fas fa-user-circle"></i>
            <div class="therapist-info">
                <h4>${therapist.full_name}</h4>
                <p>${therapist.specialization || 'Therapist'}</p>
                <p class="experience">${therapist.years_experience || 'Experienced'} years</p>
            </div>
            <div class="therapist-actions">
                <button onclick="openTherapistChat(${therapist.user_id}, '${therapist.full_name}')" class="btn-message">
                    <i class="fas fa-comment"></i> Message
                </button>
                <button onclick="bookWithTherapist(${therapist.user_id})" class="btn-book">
                    <i class="fas fa-calendar-plus"></i> Book Again
                </button>
            </div>
        </div>
    `).join('');
}

// Load client messages (conversations)
async function loadClientMessages() {
    try {
        const conversations = await getUserConversations(clientId);
        const messagesDiv = document.getElementById('clientMessagesList');
        
        if (!messagesDiv) return;
        
        if (conversations.length === 0) {
            messagesDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope"></i>
                    <p>No messages yet. Start a conversation with a therapist!</p>
                </div>`;
            return;
        }
        
        messagesDiv.innerHTML = conversations.map(conv => `
            <div class="message-card ${conv.unread_count > 0 ? 'unread' : ''}" 
                 onclick="openTherapistChat(${conv.other_user_id}, '${conv.other_user_name}', '${conv.conversation_id}')">
                <div class="message-header">
                    <strong>${conv.other_user_name}</strong>
                    <span class="message-time">${formatTime(conv.last_message_time)}</span>
                </div>
                <p class="message-preview">${conv.last_message?.substring(0, 100) || 'No messages'}</p>
                ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count} new</span>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Open chat with therapist
async function openTherapistChat(therapistId, therapistName, conversationId) {
    currentTherapistId = therapistId;
    currentConversationId = conversationId;
    
    try {
        // Mark conversation as read if conversationId exists
        if (conversationId) {
            await markConversationRead(conversationId, clientId);
        }
        
        // Get conversation history
        const messages = await getConversation(clientId, therapistId);
        
        // Show chat modal
        showClientChatModal(therapistId, therapistName, messages);
        
        // Refresh unread count
        loadClientDashboard();
        
    } catch (error) {
        console.error('Error opening chat:', error);
        showNotification('Error loading conversation', 'error');
    }
}

// Show client chat modal
function showClientChatModal(therapistId, therapistName, messages) {
    let modal = document.getElementById('clientChatModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'clientChatModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content chat-modal">
                <div class="modal-header">
                    <h3>Chat with <span id="chatTherapistName"></span></h3>
                    <button class="close-modal" onclick="closeClientChatModal()">&times;</button>
                </div>
                <div class="chat-messages" id="clientChatMessages"></div>
                <div class="chat-input">
                    <textarea id="clientChatInput" placeholder="Type your message..." rows="3"></textarea>
                    <button onclick="sendClientMessage()" class="btn-send">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add enter key to send
        document.getElementById('clientChatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendClientMessage();
            }
        });
    }
    
    document.getElementById('chatTherapistName').textContent = therapistName;
    const messagesDiv = document.getElementById('clientChatMessages');
    
    messagesDiv.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.from_user_id === clientId ? 'sent' : 'received'}">
            <div class="message-bubble">
                <p>${escapeHtml(msg.message)}</p>
                <small>${formatTime(msg.created_at)}</small>
            </div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
    document.getElementById('clientChatInput').focus();
    scrollToBottom('clientChatMessages');
}

// Send client message
async function sendClientMessage() {
    const messageInput = document.getElementById('clientChatInput');
    const message = messageInput.value.trim();
    
    if (!message || !currentTherapistId) return;
    
    try {
        if (currentConversationId) {
            await replyToMessage(currentConversationId, clientId, currentTherapistId, message);
        } else {
            await sendMessage(clientId, currentTherapistId, message);
        }
        
        messageInput.value = '';
        
        // Refresh conversation
        const messages = await getConversation(clientId, currentTherapistId);
        const messagesDiv = document.getElementById('clientChatMessages');
        
        messagesDiv.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.from_user_id === clientId ? 'sent' : 'received'}">
                <div class="message-bubble">
                    <p>${escapeHtml(msg.message)}</p>
                    <small>${formatTime(msg.created_at)}</small>
                </div>
            </div>
        `).join('');
        
        scrollToBottom('clientChatMessages');
        
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
}

// Join video session for booking
async function joinVideoSessionForBooking(bookingId) {
    try {
        const session = await getVideoSessionByBooking(bookingId);
        
        if (session && session.room_name) {
            window.location.href = `/video-call.html?room=${session.room_name}&booking=${bookingId}&role=client`;
        } else {
            showNotification('Video session not ready yet. Please wait for therapist to start.', 'info');
        }
    } catch (error) {
        console.error('Error joining video session:', error);
        showNotification('Error joining video session', 'error');
    }
}

// Reschedule booking
async function rescheduleBooking(bookingId) {
    const newDate = prompt('Enter new date (YYYY-MM-DD):', getDefaultDate());
    if (!newDate) return;
    
    const newTime = prompt('Enter new time (HH:MM in 24hr format):', '14:00');
    if (!newTime) return;
    
    try {
        await rescheduleBookingAPI(bookingId, newDate, newTime);
        showNotification('Booking rescheduled successfully!', 'success');
        loadClientDashboard();
    } catch (error) {
        console.error('Error rescheduling:', error);
        showNotification('Failed to reschedule', 'error');
    }
}

// Cancel booking
async function cancelClientBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
        const reason = prompt('Reason for cancellation (optional):');
        try {
            await cancelBooking(bookingId, reason);
            showNotification('Booking cancelled successfully!', 'success');
            loadClientDashboard();
        } catch (error) {
            console.error('Error cancelling:', error);
            showNotification('Failed to cancel booking', 'error');
        }
    }
}

// Rate session
async function rateSession(bookingId) {
    const rating = prompt('Rate your session (1-5 stars):', '5');
    if (!rating || rating < 1 || rating > 5) {
        showNotification('Please enter a rating between 1 and 5', 'error');
        return;
    }
    
    const feedback = prompt('Any feedback for the therapist? (optional):');
    
    try {
        await addClientFeedback(bookingId, feedback || '', parseInt(rating));
        showNotification('Thank you for your feedback!', 'success');
        loadClientDashboard();
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Failed to submit feedback', 'error');
    }
}

// Book with therapist
function bookWithTherapist(therapistId) {
    window.location.href = `../booking.html?therapist=${therapistId}`;
}

function bookNewSession() {
    window.location.href = '../therapists.html';
}

// Load client profile
async function loadClientProfile() {
    try {
        const profile = await getClientProfile(clientId);
        if (profile) {
            document.getElementById('profilePhone').value = profile.phone_number || '';
            document.getElementById('profileEmergency').value = profile.emergency_contact || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update profile
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phoneNumber = document.getElementById('profilePhone').value;
    const emergencyContact = document.getElementById('profileEmergency').value;
    
    try {
        await updateClientProfile(clientId, { phone_number: phoneNumber, emergency_contact: emergencyContact });
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
    }
});

// Helper functions
function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
}

function getDefaultDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

function closeClientChatModal() {
    const modal = document.getElementById('clientChatModal');
    if (modal) modal.style.display = 'none';
    currentTherapistId = null;
    currentConversationId = null;
}

function showNotification(message, type = 'info') {
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

// Add missing API functions for client
async function getClientProfile(clientId) {
    const response = await fetch(`${API_URL}/clients/${clientId}/profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
}

async function rescheduleBookingAPI(bookingId, newDate, newTime) {
    const response = await fetch(`${API_URL}/bookings/${bookingId}/reschedule`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ booking_date: newDate, booking_time: newTime })
    });
    if (!response.ok) throw new Error('Failed to reschedule');
    return response.json();
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
        
        if (tab === 'messages') loadClientMessages();
        if (tab === 'appointments') loadAllAppointments();
        if (tab === 'therapists') loadMyTherapists();
    });
});

// Initialize
checkAuth();
loadClientDashboard();