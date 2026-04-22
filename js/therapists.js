/**
 * Therapists Directory – Render, filter, and action buttons
 */

// Therapist database is loaded from therapists-data.js

// DOM Elements
const therapistsGrid = document.getElementById('therapistsList');
const searchInput = document.getElementById('therapistSearch');
const specialtyFilter = document.getElementById('specialtyFilter');
const locationFilter = document.getElementById('locationFilter');
const availabilityFilter = document.getElementById('availabilityFilter');
const resetBtn = document.getElementById('resetFilters');
const noResults = document.getElementById('noResults');

// Render therapists
function renderTherapists(therapistsToShow) {
    if (!therapistsGrid) return;
    
    if (therapistsToShow.length === 0) {
        therapistsGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    therapistsGrid.innerHTML = therapistsToShow.map(therapist => `
        <div class="therapist-card" data-id="${therapist.id}">
            <div class="therapist-online-badge">
                <div class="online-status">
                    <span class="status-dot ${therapist.onlineStatus}"></span>
                    <span>${therapist.onlineStatus === 'online' ? 'Online Now' : therapist.onlineStatus === 'away' ? 'Away' : therapist.onlineStatus === 'busy' ? 'In Session' : 'Offline'}</span>
                </div>
            </div>
            <div class="therapist-image">
                <img src="${therapist.image}" alt="${therapist.name}">
                <div class="therapist-badge">${therapist.experience}+ years</div>
            </div>
            <div class="therapist-info">
                <h3>${therapist.name}</h3>
                <p class="therapist-title">${therapist.title}</p>
                <div class="therapist-rating">
                    <span class="stars">${'★'.repeat(Math.floor(therapist.rating))}${'☆'.repeat(5 - Math.floor(therapist.rating))}</span>
                    <span class="rating-number">${therapist.rating}</span>
                    <span class="review-count">(${therapist.reviewCount} reviews)</span>
                </div>
                <p class="therapist-bio">${therapist.bio.substring(0, 100)}...</p>
                <div class="therapist-specialties">
                    ${therapist.specialties.slice(0, 3).map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                </div>
                <div class="therapist-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${therapist.location === 'online' ? 'Online' : therapist.location.charAt(0).toUpperCase() + therapist.location.slice(1)}</span>
                    <span><i class="fas fa-language"></i> ${therapist.languages[0]}</span>
                </div>
                <!-- LARGE ACTION BUTTONS -->
                <div class="therapist-actions-large">
                    <button class="action-btn video-btn" onclick="startVideoCall(${therapist.id})" title="Video Call">
                        <i class="fas fa-video"></i>
                        <span>Video Call</span>
                    </button>
                    <button class="action-btn message-btn" onclick="openMessaging(${therapist.id})" title="Send Message">
                        <i class="fas fa-comment-dots"></i>
                        <span>Message</span>
                    </button>
                    <button class="action-btn book-btn" onclick="bookTherapist(${therapist.id})" title="Book Session">
                        <i class="fas fa-calendar-check"></i>
                        <span>Book</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Action functions
function startVideoCall(therapistId) {
    const therapist = window.therapists?.find(t => t.id === therapistId);
    if (therapist) {
        alert(`🔗 Video call link would be sent to ${therapist.name}. (Feature coming soon)`);
        // In production: window.location.href = `video-call.html?therapist=${therapistId}`;
    }
}

function openMessaging(therapistId) {
    window.location.href = `messaging.html?therapist=${therapistId}`;
}

function bookTherapist(therapistId) {
    window.location.href = `therapist-profile.html?id=${therapistId}`;
}

// Filter therapists
function filterTherapists() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const specialty = specialtyFilter?.value || 'all';
    const location = locationFilter?.value || 'all';
    const availability = availabilityFilter?.value || 'all';
    
    const filtered = therapists.filter(t => {
        const matchesSearch = searchTerm === '' || 
            t.name.toLowerCase().includes(searchTerm) || 
            t.title.toLowerCase().includes(searchTerm) ||
            t.specialties.some(s => s.toLowerCase().includes(searchTerm));
        
        const matchesSpecialty = specialty === 'all' || 
            t.specialties.some(s => s.toLowerCase().includes(specialty));
        
        const matchesLocation = location === 'all' || t.location === location;
        
        const matchesAvailability = availability === 'all' || 
            (availability === 'online' && t.onlineStatus === 'online');
        
        return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailability;
    });
    
    renderTherapists(filtered);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (therapists && therapists.length) {
        renderTherapists(therapists);
    }
    
    searchInput?.addEventListener('input', filterTherapists);
    specialtyFilter?.addEventListener('change', filterTherapists);
    locationFilter?.addEventListener('change', filterTherapists);
    availabilityFilter?.addEventListener('change', filterTherapists);
    
    resetBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (specialtyFilter) specialtyFilter.value = 'all';
        if (locationFilter) locationFilter.value = 'all';
        if (availabilityFilter) availabilityFilter.value = 'all';
        filterTherapists();
    });
});