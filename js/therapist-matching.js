/**
 * MindBridge Therapist Matching AI – Full Version
 * Features: name extraction, online/offline AI, custom prompts, out‑of‑scope handling, user‑centered replies
 */

// ===== CONFIGURATION =====
const BACKEND_URL = 'http://localhost:3001';
let aiAvailable = false;
let userName = null;
let waitingForName = true;
let conversationHistory = [];
let extractedData = { primaryConcerns: [], intensity: 5, duration: "", emotions: [] };
let isProcessing = false;
let lastAIAnalysis = null;

// ===== CUSTOM PROMPTS (add your own keywords & responses) =====
const customPrompts = {
    "suicide": { response: "⚠️ I'm very concerned. Please call our crisis helpline immediately: +254 722 178 177 (24/7). You are not alone.", action: "crisis" },
    "kill myself": { response: "⚠️ Your safety is the most important thing. Call Kenya Red Cross at 1199 now. I can stay with you on chat while you call.", action: "crisis" },
    "self harm": { response: "⚠️ It takes courage to talk about self‑harm. Please contact Befrienders Kenya at +254 722 178 177. They are available 24/7.", action: "crisis" },
    "i want to die": { response: "⚠️ I'm here with you. Please call emergency helpline: 1199 (Kenya Red Cross). You matter, and help is available.", action: "crisis" }
};

// ===== DOM Elements =====
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const resultsModal = document.getElementById('resultsModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const restartChat = document.getElementById('restartChat');

// ============================================
// 1. AI STATUS & CONNECTION
// ============================================
function updateAIStatusBadge() {
    const container = document.querySelector('.chat-badge')?.parentElement;
    if (!container) return;
    const old = document.querySelector('.ai-status-badge');
    if (old) old.remove();
    const badge = document.createElement('span');
    badge.className = `ai-status-badge ${aiAvailable ? 'connected' : 'disconnected'}`;
    badge.innerHTML = aiAvailable ? ' MindBridge AI Online Mode' : ' MindBridge Offline Mode';
    container.appendChild(badge);
}

async function testBackendConnection() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/analyze-emotion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: "test" })
        });
        aiAvailable = res.ok;
    } catch (e) {
        aiAvailable = false;
    }
    updateAIStatusBadge();
    console.log(aiAvailable ? '✅ AI Connected' : '⚠️ Offline mode');
}

// ============================================
// 2. Hugging Face AI (if online)
// ============================================
async function analyzeWithHuggingFace(text) {
    if (!aiAvailable) return null;
    try {
        const response = await fetch(`${BACKEND_URL}/api/analyze-emotion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (data.success && data.analysis) {
            return { primaryEmotion: data.analysis[0].label, confidence: data.analysis[0].score };
        }
    } catch (e) { return null; }
    return null;
}

function mapEmotionToSpecialty(emotion) {
    const map = {
        'sadness': 'Depression', 'fear': 'Anxiety', 'anger': 'Anger Management',
        'joy': 'Wellness', 'surprise': 'Adjustment', 'love': 'Relationships'
    };
    return map[emotion] || 'General Counseling';
}

// ============================================
// 3. Name extraction
// ============================================
function extractName(message) {
    const patterns = [
        /my name is (\w+)/i, /i am (\w+)/i, /i'm (\w+)/i, /call me (\w+)/i,
        /^hi.*?(\w+)$/i, /^hello.*?(\w+)$/i
    ];
    for (let p of patterns) {
        const match = message.match(p);
        if (match && match[1]) return match[1];
    }
    return null;
}

// ============================================
// 4. Custom prompts & out‑of‑scope
// ============================================
function checkCustomPrompts(message) {
    const lower = message.toLowerCase();
    for (let [trigger, data] of Object.entries(customPrompts)) {
        if (lower.includes(trigger.toLowerCase())) {
            return { handled: true, response: data.response, action: data.action };
        }
    }
    return { handled: false };
}

function isOutOfScope(message) {
    const irrelevant = ["weather", "football", "politics", "stock market", "recipe", "movie", "celebrity"];
    return irrelevant.some(word => message.toLowerCase().includes(word));
}

// ============================================
// 5. Keyword fallback (offline mode)
// ============================================
const keywordMapping = {
    anxiety: ["Anxiety", "Stress"], anxious: ["Anxiety", "Stress"], worried: ["Anxiety", "Stress"],
    sad: ["Depression"], depressed: ["Depression"], hopeless: ["Depression"],
    trauma: ["Trauma", "PTSD"], abuse: ["Trauma"],
    stress: ["Stress"], overwhelmed: ["Stress"],
    relationship: ["Relationships", "Family"], family: ["Family", "Relationships"],
    school: ["Adolescent", "Stress"], exam: ["Stress", "Adolescent"],
    self: ["Self-esteem"], worthless: ["Self-esteem", "Depression"]
};
const emotionKeywords = {
    anxiety: ["anxious","nervous","worried","panic","fear","scared"],
    depression: ["sad","hopeless","empty","worthless","tired","numb"],
    anger: ["angry","frustrated","irritated","mad"],
    stress: ["stressed","overwhelmed","pressure"]
};

function analyzeMessageFallback(message) {
    const analysis = { primaryConcerns: [], emotions: [], intensity: 5, duration: "" };
    for (let [kw, specs] of Object.entries(keywordMapping)) {
        if (message.includes(kw)) analysis.primaryConcerns.push(...specs);
    }
    for (let [emotion, words] of Object.entries(emotionKeywords)) {
        if (words.some(w => message.includes(w))) analysis.emotions.push(emotion);
    }
    analysis.primaryConcerns = [...new Set(analysis.primaryConcerns)];
    analysis.emotions = [...new Set(analysis.emotions)];
    const intensityWords = { very:8, extremely:9, constantly:9, always:8, sometimes:5, rarely:2 };
    for (let [w,v] of Object.entries(intensityWords)) if (message.includes(w)) analysis.intensity = v;
    if (message.includes("week")) analysis.duration = "weeks";
    if (message.includes("month")) analysis.duration = "months";
    if (message.includes("year")) analysis.duration = "year";
    return analysis;
}

// ============================================
// 6. Core conversation intelligence
// ============================================
async function generateSmartResponse(userMessage) {
    const custom = checkCustomPrompts(userMessage);
    if (custom.handled) return custom.response;

    if (isOutOfScope(userMessage)) {
        return "That's beyond my understanding. I specialise in mental health support. Would you like me to connect you with a therapist who can answer your questions?";
    }

    if (waitingForName || !userName) {
        const name = extractName(userMessage);
        if (name) {
            userName = name;
            waitingForName = false;
            return `Hello ${userName}! It's really nice to meet you. What brings you to MindBridge today? I'm here to listen.`;
        } else {
            waitingForName = false;
            return "Thanks for sharing. Could you tell me your name? (You can say 'My name is ...')";
        }
    }

    let aiAnalysis = null;
    if (aiAvailable) {
        const tempMsg = addTempMessage('bot', '<div class="loading-spinner"><div class="spinner"></div><p>AI is analyzing...</p></div>', true);
        aiAnalysis = await analyzeWithHuggingFace(userMessage);
        if (tempMsg) tempMsg.remove();
    }

    if (aiAnalysis && aiAnalysis.confidence > 0.5) {
        lastAIAnalysis = aiAnalysis;
        const emotion = aiAnalysis.primaryEmotion;
        const responses = {
            sadness: `I hear you, ${userName}. Sadness can feel heavy. Would you like to tell me more?`,
            fear: `Thank you for sharing, ${userName}. Anxiety is tough, but you're not alone. Many people find relief through talking.`,
            anger: `I understand frustration, ${userName}. Let's explore what's underneath that anger.`,
            joy: `I'm glad to hear you're feeling positive, ${userName}! What's been contributing to that?`,
            surprise: `That sounds like a big change, ${userName}. How are you processing it?`
        };
        return responses[emotion] || `Thanks for telling me, ${userName}. Could you share a bit more about how you've been feeling lately?`;
    } else {
        const analysis = analyzeMessageFallback(userMessage.toLowerCase());
        if (analysis.emotions.includes("anxiety")) {
            return `I hear you, ${userName}. Anxiety can be really draining. How long have you been feeling this way?`;
        }
        if (analysis.emotions.includes("depression")) {
            return `Thank you for being open, ${userName}. Sadness is a heavy emotion. Do you have someone to talk to about it?`;
        }
        if (analysis.primaryConcerns.includes("Trauma")) {
            return `That sounds very painful, ${userName}. It takes courage to share this. Would you like to talk about it more?`;
        }
        return `I'm here for you, ${userName}. Could you tell me a little more about what's been on your mind?`;
    }
}

function updateExtractedData(analysis) {
    if (analysis.primaryConcerns.length) extractedData.primaryConcerns = [...new Set([...extractedData.primaryConcerns, ...analysis.primaryConcerns])];
    if (analysis.emotions.length) extractedData.emotions = [...new Set([...extractedData.emotions, ...analysis.emotions])];
    extractedData.intensity = Math.max(extractedData.intensity, analysis.intensity);
    if (analysis.duration && !extractedData.duration) extractedData.duration = analysis.duration;
}

async function processUserMessage(message) {
    const botReply = await generateSmartResponse(message);
    addMessage(botReply, 'bot');
    const analysis = analyzeMessageFallback(message.toLowerCase());
    updateExtractedData(analysis);
    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'bot', content: botReply });

    if (conversationHistory.length >= 4 && extractedData.primaryConcerns.length) {
        setTimeout(() => {
            addMessage(`${userName || 'Friend'}, based on what you've shared, I can help match you with a therapist here at MindBridge Kenya. Would you like to see your matches?`, 'bot');
            setTimeout(() => addConfirmationButtons(), 1500);
        }, 1000);
    } else {
        setTimeout(() => askFollowUp(), 1000);
    }
}

function askFollowUp() {
    if (!extractedData.primaryConcerns.length) addMessage("What specific challenges have you been facing lately?", 'bot');
    else if (!extractedData.duration) addMessage("How long have you been feeling this way?", 'bot');
    else if (extractedData.intensity === 5) addMessage("On a scale of 1-10, how intense would you say these feelings are?", 'bot');
    else addMessage("Is there anything else you'd like me to know?", 'bot');
}

// ============================================
// 7. Therapist database & matching
// ============================================
const therapists = [
    { id:1, name:"Dr. Sarah Wanjiku", title:"Clinical Psychologist", specialties:["Anxiety","Depression","Trauma","Stress"], location:"nairobi", gender:"female", experience:12, rating:4.9, reviewCount:128, bio:"Specializes in helping teens and young adults navigate anxiety, depression, and life transitions.", image:"assets/images/therapists/sarah.jpg", languages:["English","Swahili"], availability:"In-person & Online", sessionFee:"KES 3,500 - 5,000", onlineStatus:"online", ageGroups:["teen","young","adult"] },
    { id:2, name:"Michael Otieno", title:"Counseling Psychologist", specialties:["Adolescent","Family","Relationships","Stress"], location:"kisumu", gender:"male", experience:8, rating:4.8, reviewCount:94, bio:"Experienced in helping teenagers build resilience and navigate school stress.", image:"assets/images/therapists/michael.jpg", languages:["English","Swahili","Luo"], availability:"In-person & Online", sessionFee:"KES 3,000 - 4,500", onlineStatus:"online", ageGroups:["teen","young"] },
    { id:3, name:"Dr. Amina Hassan", title:"Psychiatrist", specialties:["Trauma","PTSD","Anxiety","Depression"], location:"mombasa", gender:"female", experience:15, rating:4.9, reviewCount:203, bio:"Board-certified psychiatrist specializing in trauma-informed care and medication management.", image:"assets/images/therapists/amina.jpg", languages:["English","Swahili","Arabic"], availability:"In-person only", sessionFee:"KES 5,000 - 7,000", onlineStatus:"busy", ageGroups:["adult"] },
    { id:4, name:"Grace Nderitu", title:"Family Therapist", specialties:["Family","Relationships","Adolescent","Self-esteem"], location:"online", gender:"female", experience:10, rating:4.9, reviewCount:156, bio:"Specializes in family dynamics, parent-teen communication, and relationship issues.", image:"assets/images/therapists/grace.jpg", languages:["English","Swahili","Kikuyu"], availability:"Online only", sessionFee:"KES 3,500 - 5,500", onlineStatus:"online", ageGroups:["teen","young","adult","family"] }
];

function findTherapistMatches() {
    const tempMsg = addTempMessage('bot', '<div class="loading-spinner"><div class="spinner"></div><p>Finding your best matches...</p></div>', true);
    setTimeout(() => {
        if (tempMsg) tempMsg.remove();
        const matches = therapists.map(t => {
            let score = 0, reasons = [];
            for (const concern of extractedData.primaryConcerns) {
                if (t.specialties.some(s => s === concern || concern.includes(s))) {
                    score += 30; reasons.push(`Specializes in ${concern}`); break;
                }
            }
            if (extractedData.intensity > 7 && t.experience >= 10) { score += 20; reasons.push("Experienced with high-intensity cases"); }
            else if (extractedData.intensity > 5 && t.experience >= 5) score += 10;
            if (t.availability.includes("Online")) { score += 10; reasons.push("Available for online sessions"); }
            if (lastAIAnalysis) score += Math.round(lastAIAnalysis.confidence * 15);
            return { ...t, matchScore: score, matchReasons: reasons };
        });
        const topMatches = matches.sort((a,b) => b.matchScore - a.matchScore).slice(0,3);
        displayResults(topMatches);
    }, 1500);
}

function displayResults(matches) {
    modalBody.innerHTML = matches.map(t => `
        <div class="result-card">
            <div class="result-avatar"><i class="fas fa-user-md"></i></div>
            <div class="result-info">
                <h3>${t.name}</h3>
                <div class="result-title">${t.title}</div>
                <div class="match-score">${Math.round(t.matchScore)}% Match</div>
                <p class="result-bio">${t.bio.substring(0,100)}...</p>
                <div class="match-reasons">${t.matchReasons.map(r => `<span class="match-reason"><i class="fas fa-check-circle"></i> ${r}</span>`).join('')}</div>
                <div class="result-actions">
                    <a href="therapist-profile.html?id=${t.id}" class="btn btn-primary btn-small"><i class="fas fa-eye"></i> View Profile</a>
                    <a href="booking.html?therapist=${t.id}" class="btn btn-outline btn-small"><i class="fas fa-calendar-check"></i> Book Session</a>
                </div>
            </div>
        </div>
    `).join('');
    resultsModal.classList.add('active');
}

// ============================================
// 8. UI Helpers
// ============================================
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `<p>${text}</p>`;
    div.appendChild(avatar);
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addTempMessage(sender, html, isHtml = false) {
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    div.id = 'tempMessage';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (isHtml) bubble.innerHTML = html;
    else bubble.textContent = html;
    div.appendChild(avatar);
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message bot-message';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    chatMessages.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addConfirmationButtons() {
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-bubble">
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button class="btn btn-primary" id="confirmYes">Yes, show matches</button>
                <button class="btn btn-outline" id="confirmNo">Share more</button>
            </div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
    document.getElementById('confirmYes')?.addEventListener('click', () => { div.remove(); findTherapistMatches(); });
    document.getElementById('confirmNo')?.addEventListener('click', () => { div.remove(); addMessage("Of course. What else would you like to share?", 'bot'); });
}

function resetChat() {
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-bubble">
                <p>👋 Hi there. I'm here to listen, without judgment, and help you match with our qualified therapists.</p>
                <p>Could you tell me your name? (e.g., "My name is Peter")</p>
            </div>
        </div>
    `;
    conversationHistory = [];
    extractedData = { primaryConcerns: [], intensity: 5, duration: "", emotions: [] };
    lastAIAnalysis = null;
    userName = null;
    waitingForName = true;
    scrollToBottom();
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;
    userInput.value = '';
    addMessage(message, 'user');
    showTypingIndicator();
    isProcessing = true;
    setTimeout(async () => {
        hideTypingIndicator();
        await processUserMessage(message);
        isProcessing = false;
    }, 500);
}

// ============================================
// 9. INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            userInput.value = chip.dataset.prompt;
            sendMessage();
        });
    });
    closeModal.addEventListener('click', () => resultsModal.classList.remove('active'));
    restartChat.addEventListener('click', () => { resultsModal.classList.remove('active'); resetChat(); });
    document.querySelector('.modal-overlay')?.addEventListener('click', () => resultsModal.classList.remove('active'));
    testBackendConnection();
});