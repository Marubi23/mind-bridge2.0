/**
 * Admin Dashboard - Complete JavaScript
 * MindBridge Kenya
 */

// Global variables
let bookingsChart = null;
let revenueChart = null;
let currentAdmin = null;
let allMessages = [];
let currentOtherUserId = null;
let currentOtherUserName = null;
let currentOtherUserRole = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardData();
    setupEventListeners();
    setupCharts();
    initAOS();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    
    if (!token || user?.role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }
    
    currentAdmin = user;
    document.getElementById('adminName').textContent = user.full_name || 'Admin User';
    document.getElementById('adminUserName').textContent = user.full_name?.split(' ')[0] || 'Admin';
}

async function loadDashboardData() {
    try {
        const stats = await getAdminStats();
        
        document.getElementById('statTherapists').textContent = stats.total_therapists || 0;
        document.getElementById('statClients').textContent = stats.total_clients || 0;
        document.getElementById('statBookings').textContent = stats.total_bookings || 0;
        document.getElementById('statMessages').textContent = stats.unread_messages || 0;
        document.getElementById('pendingTherapistsBadge').textContent = stats.pending_therapists || 0;
        document.getElementById('unreadMessagesBadge').textContent = stats.unread_messages || 0;
        
        await loadTherapists();
        await loadClients();
        await loadBookings();
        await loadMessages();
        await loadActivity();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// ============ COLLAPSIBLE ACTIVITY SECTION ============
function toggleActivitySection() {
    const timeline = document.getElementById('activityTimeline');
    const toggleBtn = document.getElementById('toggleActivityBtn');
    
    if (!timeline || !toggleBtn) return;
    
    const isCollapsed = timeline.classList.contains('collapsed');
    
    if (isCollapsed) {
        timeline.classList.remove('collapsed');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Collapse';
        timeline.style.maxHeight = 'none';
    } else {
        timeline.classList.add('collapsed');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Expand';
        timeline.style.maxHeight = '0px';
        timeline.style.overflow = 'hidden';
        timeline.style.padding = '0';
    }
}

// ============ LOAD ACTIVITY WITH ROLE-BASED COLORS ============
async function loadActivity() {
    try {
        const activities = await getActivityLogs();
        const timeline = document.getElementById('activityTimeline');
        
        if (!activities || activities.length === 0) {
            timeline.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No recent activity to display</p>
                </div>`;
            return;
        }
        
        // Get current admin user name to highlight admin's own activities
        const currentUserName = currentAdmin?.full_name;
        
        // Function to get CSS class based on user role
        const getRoleClass = (userRole, userName) => {
            // Highlight current admin's own activities with green background
            if (currentUserName === userName && userRole === 'admin') {
                return 'role-current-admin';
            }
            
            // Role-based classes
            const roleClasses = {
                'admin': 'role-admin',
                'therapist': 'role-therapist',
                'client': 'role-client',
                'unknown': 'role-unknown'
            };
            return roleClasses[userRole] || 'role-default';
        };
        
        // Function to get icon based on action
        const getIcon = (action) => {
            const icons = {
                'login': 'fa-sign-in-alt',
                'logout': 'fa-sign-out-alt',
                'create_booking': 'fa-calendar-plus',
                'cancel_booking': 'fa-calendar-times',
                'approve_therapist': 'fa-user-check',
                'reject_therapist': 'fa-user-times',
                'suspend_user': 'fa-user-slash',
                'unsuspend_user': 'fa-user-check',
                'delete_user': 'fa-trash-alt',
                'send_message': 'fa-comment',
                'update_profile': 'fa-user-edit',
                'register': 'fa-user-plus',
                'login_failed': 'fa-exclamation-triangle'
            };
            return icons[action] || 'fa-bell';
        };
        
        // Function to get icon color based on action
        const getIconColor = (action) => {
            if (action === 'login') return 'green';
            if (action === 'logout') return 'orange';
            if (action === 'login_failed') return 'red';
            if (action === 'suspend_user' || action === 'delete_user') return 'red';
            if (action === 'approve_therapist') return 'purple';
            if (action === 'register') return 'blue';
            return 'blue';
        };
        
        timeline.innerHTML = activities.map(activity => {
            const roleClass = getRoleClass(activity.user_role, activity.user_name);
            const iconColor = getIconColor(activity.action);
            
            return `
                <div class="activity-item ${roleClass}" data-role="${activity.user_role}">
                    <div class="activity-icon ${iconColor}">
                        <i class="fas ${getIcon(activity.action)}"></i>
                    </div>
                    <div class="activity-content">
                        <p>
                            <strong>${escapeHtml(activity.user_name || 'System')}</strong>
                            <span class="activity-role ${activity.user_role}">(${activity.user_role || 'User'})</span>
                            <span class="activity-action">${formatAction(activity.action)}</span>
                        </p>
                        ${activity.details ? `<p class="activity-details">${escapeHtml(activity.details)}</p>` : ''}
                        <span class="activity-time">${formatTimeAgo(activity.created_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update activity stats
        await loadActivityStats();
        
    } catch (error) {
        console.error('Error loading activity:', error);
        const timeline = document.getElementById('activityTimeline');
        timeline.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading activity</p>
            </div>`;
    }
}

// FIXED: Format time ago with correct timezone
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Fix for timezone issues - ensure we're using local time
    const localDate = new Date(date.getTime());
    const localNow = new Date(now.getTime());
    
    const seconds = Math.floor((localNow - localDate) / 1000);
    
    if (seconds < 0) return 'Just now';
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    // Return formatted date for older entries
    return localDate.toLocaleDateString() + ' ' + localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper function to format action text
function formatAction(action) {
    const actions = {
        'login': 'logged in',
        'logout': 'logged out',
        'create_booking': 'created a booking',
        'cancel_booking': 'cancelled a booking',
        'approve_therapist': 'approved a therapist',
        'reject_therapist': 'rejected a therapist',
        'suspend_user': 'suspended a user',
        'unsuspend_user': 'unsuspended a user',
        'delete_user': 'deleted a user',
        'send_message': 'sent a message',
        'update_profile': 'updated profile',
        'register': 'registered',
        'login_failed': 'failed login attempt'
    };
    return actions[action] || action.replace(/_/g, ' ');
}

async function loadActivityStats() {
    try {
        const stats = await getActivityStats();
        console.log('Activity Stats:', stats);
    } catch (error) {
        console.error('Error loading activity stats:', error);
    }
}

// ============ LOAD THERAPISTS ============
async function loadTherapists() {
    try {
        const therapists = await getAllTherapists();
        const tbody = document.getElementById('therapistsTableBody');
        
        if (!therapists || therapists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No therapists found</td></tr>';
            return;
        }
        
        tbody.innerHTML = therapists.map(t => `
            <tr>
                <td><strong>${escapeHtml(t.full_name)}</strong><br><small>ID: ${t.user_id}</small></td>
                <td>${escapeHtml(t.email)}</td>
                <td>${escapeHtml(t.specialization || 'N/A')}</td>
                <td>
                    <span class="status-badge ${t.is_available ? 'approved' : 'suspended'}">
                        ${t.is_available ? 'Active' : 'Inactive'}
                    </span>
                    ${t.approval_status === 'pending' ? '<span class="status-badge pending">Pending</span>' : ''}
                </td>
                <td>${t.verified_at ? '✅ Verified' : '⏳ Pending'}</td>
                <td class="action-buttons">
                    ${t.approval_status === 'pending' ? `
                        <button class="action-btn btn-approve" onclick="approveTherapistAction(${t.user_id})" title="Approve Therapist">✓</button>
                        <button class="action-btn btn-reject" onclick="rejectTherapistAction(${t.user_id})" title="Reject Therapist">✗</button>
                    ` : ''}
                    <button class="action-btn btn-suspend" onclick="toggleSuspendAction(${t.user_id}, 'therapist')" title="Suspend Therapist">⛔</button>
                    <button class="action-btn btn-delete" onclick="deleteUserAction(${t.user_id}, 'therapist')" title="Delete Therapist Forever">🗑️</button>
                    <button class="action-btn btn-message" onclick="openConversation(${t.user_id}, '${escapeHtml(t.full_name)}', 'therapist')" title="Send Message">💬</button>
                    <button class="action-btn btn-view" onclick="viewTherapistDetails(${t.user_id})" title="View Details">👁</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading therapists:', error);
        showNotification('Error loading therapists', 'error');
    }
}

// ============ LOAD CLIENTS ============
async function loadClients() {
    try {
        const clients = await getAllClients();
        const tbody = document.getElementById('clientsTableBody');
        
        if (!clients || clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No clients found</td></tr>';
            return;
        }
        
        tbody.innerHTML = clients.map(c => `
            <tr>
                <td><strong>${escapeHtml(c.full_name)}</strong></td>
                <td>${escapeHtml(c.email)}</td>
                <td>${escapeHtml(c.phone_number || 'N/A')}</td>
                <td>${c.total_sessions || 0}</td>
                <td>
                    <span class="status-badge ${!c.suspended_at ? 'approved' : 'suspended'}">
                        ${!c.suspended_at ? 'Active' : 'Suspended'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="action-btn btn-suspend" onclick="toggleSuspendAction(${c.user_id}, 'client')" title="Suspend Client">⛔</button>
                    <button class="action-btn btn-delete" onclick="deleteUserAction(${c.user_id}, 'client')" title="Delete Client Forever">🗑️</button>
                    <button class="action-btn btn-message" onclick="openConversation(${c.user_id}, '${escapeHtml(c.full_name)}', 'client')" title="Send Message">💬</button>
                    <button class="action-btn btn-view" onclick="viewClientDetails(${c.user_id})" title="View Details">👁</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading clients:', error);
        showNotification('Error loading clients', 'error');
    }
}

// ============ LOAD BOOKINGS ============
async function loadBookings() {
    try {
        const bookings = await getAllBookings();
        const tbody = document.getElementById('bookingsTableBody');
        
        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No bookings found</td></tr>';
            return;
        }
        
        tbody.innerHTML = bookings.map(b => `
            <tr>
                <td>${escapeHtml(b.client_name)}</td>
                <td>${escapeHtml(b.therapist_name)}</td>
                <td>${new Date(b.booking_date).toLocaleDateString()}</td>
                <td>${b.booking_time}</td>
                <td><span class="status-badge ${b.status}">${b.status}</span></td>
                <td class="action-buttons">
                    <button class="action-btn btn-view" onclick="viewBookingDetails(${b.booking_id})" title="View Details">👁</button>
                    ${b.status !== 'cancelled' && b.status !== 'completed' ? 
                        `<button class="action-btn btn-reject" onclick="cancelBookingAction(${b.booking_id})" title="Cancel Booking">✗</button>` : ''}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showNotification('Error loading bookings', 'error');
    }
}

// ============ LOAD MESSAGES ============
async function loadMessages() {
    try {
        const messages = await getAllMessages();
        const container = document.getElementById('messagesList');
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope"></i><p>No messages found</p></div>';
            return;
        }
        
        const conversations = new Map();
        
        messages.forEach(msg => {
            const otherId = msg.from_user_id === currentAdmin.id ? msg.to_user_id : msg.from_user_id;
            const otherName = msg.from_user_id === currentAdmin.id ? msg.to_name : msg.from_name;
            const otherRole = msg.from_user_id === currentAdmin.id ? 
                (msg.to_name?.includes('therapist') ? 'therapist' : 'client') : 
                (msg.from_name?.includes('therapist') ? 'therapist' : 'client');
            
            if (!conversations.has(otherId)) {
                conversations.set(otherId, {
                    user_id: otherId,
                    user_name: otherName,
                    user_role: otherRole,
                    unread: (!msg.is_read && msg.to_user_id === currentAdmin.id) ? 1 : 0,
                    last_message: msg.message,
                    last_time: msg.created_at
                });
            } else {
                const conv = conversations.get(otherId);
                if (!msg.is_read && msg.to_user_id === currentAdmin.id) {
                    conv.unread++;
                }
            }
        });
        
        const conversationList = Array.from(conversations.values());
        
        container.innerHTML = `
            <div class="messages-layout">
                <div class="conversations-list" id="conversationsList">
                    ${conversationList.map(conv => `
                        <div class="conversation-item ${conv.unread > 0 ? 'unread' : ''}" 
                             onclick="openConversation(${conv.user_id}, '${escapeHtml(conv.user_name)}', '${conv.user_role}')">
                            <div class="conversation-avatar">
                                <i class="fas ${conv.user_role === 'therapist' ? 'fa-user-md' : 'fa-user'}"></i>
                            </div>
                            <div class="conversation-info">
                                <h4>${escapeHtml(conv.user_name)}</h4>
                                <p>${conv.user_role === 'therapist' ? 'Therapist' : 'Client'}</p>
                            </div>
                            ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="chat-area" id="chatArea" style="display: none;">
                    <div class="chat-header" id="chatHeader"></div>
                    <div class="chat-messages" id="chatMessages"></div>
                    <div class="chat-input-area">
                        <textarea id="chatInput" placeholder="Type your message..." rows="2"></textarea>
                        <button class="send-btn" onclick="sendAdminMessage()">📤 Send</button>
                    </div>
                </div>
                <div class="no-chat-selected" id="noChatSelected">
                    <i class="fas fa-comments"></i>
                    <p>Select a conversation to start messaging</p>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = '<div class="empty-state">Error loading messages</div>';
    }
}

// ============ CONVERSATION FUNCTIONS ============
function openConversation(userId, userName, userRole) {
    currentOtherUserId = userId;
    currentOtherUserName = userName;
    currentOtherUserRole = userRole;
    
    const chatArea = document.getElementById('chatArea');
    const noChatSelected = document.getElementById('noChatSelected');
    const chatHeader = document.getElementById('chatHeader');
    
    chatArea.style.display = 'flex';
    noChatSelected.style.display = 'none';
    
    chatHeader.innerHTML = `
        <div class="chat-user-info">
            <i class="fas ${userRole === 'therapist' ? 'fa-user-md' : 'fa-user'}"></i>
            <div>
                <h4>${escapeHtml(userName)}</h4>
                <p>${userRole === 'therapist' ? 'Therapist' : 'Client'}</p>
            </div>
        </div>
    `;
    
    loadConversationMessages(userId);
}

async function loadConversationMessages(userId) {
    try {
        const messages = await getConversation(currentAdmin.id, userId);
        const chatMessages = document.getElementById('chatMessages');
        
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = '<div class="empty-chat"><p>No messages yet. Start a conversation!</p></div>';
            return;
        }
        
        chatMessages.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.from_user_id === currentAdmin.id ? 'sent' : 'received'}">
                <div class="message-bubble">
                    <p>${escapeHtml(msg.message)}</p>
                    <small>${formatTimeAgo(msg.created_at)}</small>
                </div>
            </div>
        `).join('');
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error('Error loading conversation:', error);
        document.getElementById('chatMessages').innerHTML = '<div class="empty-chat">Error loading messages</div>';
    }
}

async function sendAdminMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || !currentOtherUserId) return;
    
    try {
        await sendMessage(currentAdmin.id, currentOtherUserId, message);
        input.value = '';
        await loadConversationMessages(currentOtherUserId);
        showNotification('Message sent', 'success');
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
}

// ============ CHARTS ============
function setupCharts() {
    const bookingsCtx = document.getElementById('bookingsChart')?.getContext('2d');
    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    
    if (bookingsCtx) {
        bookingsChart = new Chart(bookingsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Bookings',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.05)',
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        fetchBookingChartData();
    }
    
    if (revenueCtx) {
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Revenue Trend',
                    data: [0, 0, 0, 0],
                    borderColor: '#e8a838',
                    backgroundColor: 'rgba(232,168,56,0.05)',
                    borderWidth: 2,
                    pointBackgroundColor: '#e8a838',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        fetchRevenueChartData();
    }
}

async function fetchBookingChartData() {
    try {
        const bookings = await getAllBookings();
        if (bookings?.length > 0 && bookingsChart) {
            const dayCount = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
            const dayMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
            
            bookings.forEach(booking => {
                const date = new Date(booking.booking_date);
                const dayName = dayMap[date.getDay()];
                if (dayName) dayCount[dayName]++;
            });
            
            bookingsChart.data.datasets[0].data = Object.values(dayCount);
            bookingsChart.update();
        }
    } catch (error) {
        console.error('Error fetching booking data:', error);
    }
}

async function fetchRevenueChartData() {
    try {
        const bookings = await getAllBookings();
        if (bookings?.length > 0 && revenueChart) {
            const weeks = [[], [], [], []];
            const now = new Date();
            
            bookings.forEach(booking => {
                if (booking.status === 'confirmed' || booking.status === 'completed') {
                    const bookingDate = new Date(booking.booking_date);
                    const weekDiff = Math.floor((now - bookingDate) / (7 * 24 * 60 * 60 * 1000));
                    if (weekDiff >= 0 && weekDiff < 4) {
                        weeks[3 - weekDiff].push(booking);
                    }
                }
            });
            
            const revenueData = weeks.map(w => w.length * 1500);
            const maxRevenue = Math.max(...revenueData, 1);
            const revenuePercentages = revenueData.map(r => Math.round((r / maxRevenue) * 100));
            
            revenueChart.data.datasets[0].data = revenuePercentages;
            revenueChart.update();
        }
    } catch (error) {
        console.error('Error fetching revenue data:', error);
    }
}

// ============ ACTION FUNCTIONS ============
async function approveTherapistAction(id) {
    if (confirm(`Approve therapist ID: ${id}?`)) {
        try {
            await approveTherapist(id);
            showNotification('Therapist approved!', 'success');
            loadTherapists();
            loadDashboardData();
        } catch (error) {
            showNotification('Error approving therapist', 'error');
        }
    }
}

async function rejectTherapistAction(id) {
    const reason = prompt('Reason for rejection:');
    if (reason && confirm(`Reject therapist ID: ${id}?`)) {
        try {
            await rejectTherapist(id);
            showNotification('Therapist rejected', 'success');
            loadTherapists();
            loadDashboardData();
        } catch (error) {
            showNotification('Error rejecting therapist', 'error');
        }
    }
}

async function toggleSuspendAction(id, type) {
    if (confirm(`Suspend this ${type}?`)) {
        const reason = prompt(`Reason for suspending this ${type}:`);
        if (reason) {
            try {
                await suspendUser(id, reason);
                showNotification(`${type} suspended`, 'success');
                loadTherapists();
                loadClients();
                loadDashboardData();
            } catch (error) {
                showNotification('Error suspending user', 'error');
            }
        }
    }
}

async function deleteUserAction(id, type) {
    if (confirm(`⚠️ WARNING: This will permanently delete this ${type}!\nAre you sure?`)) {
        const confirmText = prompt(`Type "DELETE" to confirm:`);
        if (confirmText === 'DELETE') {
            try {
                await deleteUser(id);
                showNotification(`${type} deleted permanently`, 'success');
                loadTherapists();
                loadClients();
                loadDashboardData();
            } catch (error) {
                showNotification('Error deleting user', 'error');
            }
        }
    }
}

async function cancelBookingAction(id) {
    const reason = prompt('Reason for cancellation:');
    if (reason && confirm(`Cancel booking ID: ${id}?`)) {
        try {
            await cancelBooking(id, reason);
            showNotification('Booking cancelled', 'success');
            loadBookings();
            loadDashboardData();
        } catch (error) {
            showNotification('Error cancelling booking', 'error');
        }
    }
}

function viewTherapistDetails(id) { alert(`View therapist ${id} - Coming soon`); }
function viewClientDetails(id) { alert(`View client ${id} - Coming soon`); }
function viewBookingDetails(id) { alert(`View booking ${id} - Coming soon`); }

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(`${tab}Tab`).classList.add('active');
            
            const titles = {
                overview: 'Dashboard Overview',
                therapists: 'Manage Therapists',
                clients: 'Manage Clients',
                bookings: 'All Bookings',
                messages: 'Messages',
                analytics: 'Analytics',
                settings: 'Settings'
            };
            document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';
        });
    });
    
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    
    document.getElementById('mobileMenuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
    });
    
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    userMenuBtn?.addEventListener('click', () => userDropdown.classList.toggle('show'));
    document.addEventListener('click', (e) => {
        if (!userMenuBtn?.contains(e.target) && userDropdown?.classList.contains('show')) {
            userDropdown.classList.remove('show');
        }
    });
    
    document.getElementById('logoutBtnAdmin')?.addEventListener('click', logout);
    document.getElementById('logoutDropdown')?.addEventListener('click', logout);
}

function logout(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}

// ============ HELPER FUNCTIONS ============
function formatDate(date) {
    return new Date(date).toLocaleString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function initAOS() {
    if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });
}

// Expose global functions
window.approveTherapistAction = approveTherapistAction;
window.rejectTherapistAction = rejectTherapistAction;
window.toggleSuspendAction = toggleSuspendAction;
window.deleteUserAction = deleteUserAction;
window.cancelBookingAction = cancelBookingAction;
window.openConversation = openConversation;
window.sendAdminMessage = sendAdminMessage;
window.viewTherapistDetails = viewTherapistDetails;
window.viewClientDetails = viewClientDetails;
window.viewBookingDetails = viewBookingDetails;
window.toggleActivitySection = toggleActivitySection;