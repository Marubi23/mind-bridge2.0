/**
 * Messaging Module – Client-Therapist Chat
 * Stores messages in localStorage (can be upgraded to real-time backend)
 */

let currentTherapist = null;
let messages = [];
let clientName = localStorage.getItem('mindbridge_client_name') || 'You';

// Load therapist from URL
function loadTherapist() {
    const urlParams = new URLSearchParams(window.location.search);
    const therapistId = parseInt(urlParams.get('therapist'));
    
    if (!therapistId || !window.therapists) {
        document.getElementById('therapistName').innerText = 'Therapist not found';
        return;
    }
    
    currentTherapist = window.therapists.find(t => t.id === therapistId);
    
    if (currentTherapist) {
        // Update header
        document.getElementById('therapistName').innerText = currentTherapist.name;
        const avatarContainer = document.getElementById('therapistAvatar');
        if (currentTherapist.image) {
            avatarContainer.innerHTML = `<img src="${currentTherapist.image}" alt="${currentTherapist.name}">`;
        } else {
            avatarContainer.innerHTML = '<i class="fas fa-user-md"></i>';
        }
        
        const statusSpan = document.getElementById('therapistStatus');
        if (currentTherapist.onlineStatus === 'online') {
            statusSpan.className = 'therapist-status online';
            statusSpan.innerHTML = '<i class="fas fa-circle"></i> Online now';
        } else {
            statusSpan.className = 'therapist-status offline';
            statusSpan.innerHTML = '<i class="fas fa-circle"></i> Typically responds within 24 hours';
        }
        
        // Update view profile link
        const profileLink = document.getElementById('viewProfileBtn');
        if (profileLink) {
            profileLink.href = `therapist-profile.html?id=${currentTherapist.id}`;
        }
        
        // Load messages
        loadMessages();
        renderMessages();
    } else {
        document.getElementById('therapistName').innerText = 'Therapist not found';
    }
}

// Load messages from localStorage
function loadMessages() {
    const key = `messages_${currentTherapist?.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
        messages = JSON.parse(stored);
    } else {
        // Sample welcome message from therapist
        messages = [{
            id: Date.now(),
            sender: 'therapist',
            text: `Hello! I'm ${currentTherapist?.name}. Thank you for reaching out. How can I support you today?`,
            timestamp: new Date().toISOString(),
            read: true
        }];
        saveMessages();
    }
}

// Save messages to localStorage
function saveMessages() {
    if (!currentTherapist) return;
    const key = `messages_${currentTherapist.id}`;
    localStorage.setItem(key, JSON.stringify(messages));
}

// Render messages in chat
function renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `<div class="welcome-message"><i class="fas fa-comments"></i><p>No messages yet. Start the conversation!</p></div>`;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender === 'client' ? 'client-message' : 'therapist-message'}">
            <div class="message-avatar">
                <i class="fas ${msg.sender === 'client' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-bubble">
                <p>${escapeHtml(msg.text)}</p>
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send a new message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentTherapist) return;
    
    const newMessage = {
        id: Date.now(),
        sender: 'client',
        text: text,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    messages.push(newMessage);
    saveMessages();
    renderMessages();
    input.value = '';
    
    // Simulate therapist reply after 2 seconds (for demo)
    simulateTherapistReply(text);
}

// Simulate automatic reply (in real app, this would be a backend webhook)
function simulateTherapistReply(clientMessage) {
    setTimeout(() => {
        const replyText = generateAutoReply(clientMessage);
        const replyMessage = {
            id: Date.now() + 1,
            sender: 'therapist',
            text: replyText,
            timestamp: new Date().toISOString(),
            read: true
        };
        messages.push(replyMessage);
        saveMessages();
        renderMessages();
    }, 2000);
}

// Generate context-aware auto-reply (can be replaced with AI later)
function generateAutoReply(clientMessage) {
    const lowerMsg = clientMessage.toLowerCase();
    if (lowerMsg.includes('anxious') || lowerMsg.includes('anxiety')) {
        return `Thank you for sharing that. Anxiety can be really challenging. Would you like to schedule a session to talk more about coping strategies? I'm here to help.`;
    }
    if (lowerMsg.includes('sad') || lowerMsg.includes('depressed')) {
        return `I hear that you're feeling down. That takes courage to admit. Would you like to explore what might be contributing to these feelings together?`;
    }
    if (lowerMsg.includes('stress') || lowerMsg.includes('overwhelmed')) {
        return `Stress can feel so heavy. I'd love to help you find some relief. Would you be open to a short phone call this week?`;
    }
    if (lowerMsg.includes('sleep') || lowerMsg.includes('insomnia')) {
        return `Sleep issues often go hand-in-hand with mental health. I have some techniques that might help. Shall we discuss them in a session?`;
    }
    return `Thank you for your message. I'd like to understand more. Would you be available for a 15-minute chat this week? Let me know what works for you.`;
}

// Helper: format timestamp
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadTherapist();
    
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});