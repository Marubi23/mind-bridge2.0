/**
 * Therapist Directory with Online Status
 * Real-time availability tracking
 */

// Therapist data with online status
const therapists = [
    {
        id: 1,
        name: "Dr. Sarah Wanjiku",
        title: "Clinical Psychologist",
        specialty: "anxiety",
        specialties: ["Anxiety & Depression", "Trauma & PTSD"],
        location: "nairobi",
        gender: "female",
        experience: 12,
        rating: 4.9,
        reviewCount: 128,
        bio: "Dr. Sarah specializes in helping teens and young adults navigate anxiety, depression, and life transitions.",
        image: "assets/images/therapists/sarah.jpg",
        languages: ["English", "Swahili"],
        availability: "In-person & Online",
        sessionFee: "KES 3,500 - 5,000",
        onlineStatus: "online",
        lastOnline: null,
        ageGroups: ["teen", "young", "adult"],
        education: "PhD in Clinical Psychology - UoN"
    },
    // ... more therapists with onlineStatus: "online", "away", "offline", "busy"
];

// Simulate real-time status updates
function updateOnlineStatus() {
    setInterval(() => {
        therapists.forEach(therapist => {
            // Random status change for demo
            const statuses = ["online", "away", "offline", "busy"];
            if (Math.random() > 0.7) {
                therapist.onlineStatus = statuses[Math.floor(Math.random() * statuses.length)];
                therapist.lastOnline = new Date().toLocaleTimeString();
            }
        });
        
        // Re-render if on therapists page
        if (document.getElementById('therapistsList')) {
            filterTherapists();
        }
    }, 30000); // Update every 30 seconds
}

function renderTherapists(therapistsToShow) {
    const container = document.getElementById('therapistsList');
    const noResults = document.getElementById('noResults');
    
    if (!container) return;
    
    if (therapistsToShow.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    container.innerHTML = therapistsToShow.map(t => `
        <div class="therapist-card" data-id="${t.id}">
            <div class="therapist-online-badge">
                <div class="online-status">
                    <span class="status-dot ${t.onlineStatus}"></span>
                    <span>${t.onlineStatus === 'online' ? 'Online Now' : t.onlineStatus === 'away' ? 'Away' : t.onlineStatus === 'busy' ? 'In Session' : 'Offline'}</span>
                    ${t.lastOnline ? `<span class="last-online">Last seen ${t.lastOnline}</span>` : ''}
                </div>
            </div>
            <div class="therapist-image">
                <img src="${t.image}" alt="${t.name}">
                <div class="therapist-badge">${t.experience}+ years</div>
            </div>
            <div class="therapist-info">
                <h3>${t.name}</h3>
                <p class="therapist-title">${t.title}</p>
                <div class="therapist-rating">
                    <span class="stars">${'★'.repeat(Math.floor(t.rating))}${'☆'.repeat(5-Math.floor(t.rating))}</span>
                    <span class="rating-number">${t.rating}</span>
                    <span class="review-count">(${t.reviewCount} reviews)</span>
                </div>
                <p class="therapist-bio">${t.bio.substring(0, 100)}...</p>
                <div class="therapist-specialties">
                    ${t.specialties.map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                </div>
                <div class="therapist-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${t.location === 'online' ? 'Online' : t.location.charAt(0).toUpperCase() + t.location.slice(1)}</span>
                    <span><i class="fas fa-language"></i> ${t.languages.join(', ')}</span>
                    <span><i class="fas fa-video"></i> ${t.availability}</span>
                </div>
                <div class="therapist-footer">
                    <div class="session-fee">${t.sessionFee}</div>
                    <div class="quick-actions">
                        <button class="quick-action-btn" onclick="quickMessage(${t.id})" title="Send Message">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="quick-action-btn" onclick="quickBook(${t.id})" title="Book Session">
                            <i class="fas fa-calendar-check"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="therapist-actions">
                <div class="action-icon" onclick="viewProfile(${t.id})" title="View Profile">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="action-icon" onclick="quickMessage(${t.id})" title="Send Message">
                    <i class="fas fa-comment"></i>
                </div>
                <div class="action-icon" onclick="quickBook(${t.id})" title="Book Session">
                    <i class="fas fa-calendar-plus"></i>
                </div>
            </div>
        </div>
    `).join('');
}

function viewProfile(id) {
    window.location.href = `therapist-profile.html?id=${id}`;
}

function quickMessage(id) {
    window.location.href = `messaging.html?therapist=${id}`;
}

function quickBook(id) {
    window.location.href = `booking.html?therapist=${id}`;
}

function filterTherapists() {
    const searchTerm = document.getElementById('therapistSearch')?.value.toLowerCase() || '';
    const specialty = document.getElementById('specialtyFilter')?.value || 'all';
    const location = document.getElementById('locationFilter')?.value || 'all';
    const availability = document.getElementById('availabilityFilter')?.value || 'all';
    
    const filtered = therapists.filter(t => {
        const matchesSearch = searchTerm === '' || 
            t.name.toLowerCase().includes(searchTerm) || 
            t.title.toLowerCase().includes(searchTerm) ||
            t.specialties.some(s => s.toLowerCase().includes(searchTerm));
        
        const matchesSpecialty = specialty === 'all' || 
            t.specialties.some(s => s.toLowerCase().includes(specialty));
        
        const matchesLocation = location === 'all' || t.location === location;
        
        const matchesAvailability = availability === 'all' || 
            (availability === 'online' && t.onlineStatus === 'online') ||
            (availability === 'today' && t.onlineStatus === 'online') ||
            (availability === 'week');
        
        return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailability;
    });
    
    renderTherapists(filtered);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('therapistsList')) {
        renderTherapists(therapists);
        updateOnlineStatus();
        
        document.getElementById('therapistSearch')?.addEventListener('input', filterTherapists);
        document.getElementById('specialtyFilter')?.addEventListener('change', filterTherapists);
        document.getElementById('locationFilter')?.addEventListener('change', filterTherapists);
        document.getElementById('availabilityFilter')?.addEventListener('change', filterTherapists);
        
        document.getElementById('resetFilters')?.addEventListener('click', () => {
            document.getElementById('therapistSearch').value = '';
            document.getElementById('specialtyFilter').value = 'all';
            document.getElementById('locationFilter').value = 'all';
            document.getElementById('availabilityFilter').value = 'all';
            filterTherapists();
        });
    }
});