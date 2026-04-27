/**
 * Therapists Directory - Professional Version
 * Connected to PostgreSQL Backend
 */

const API_URL = 'http://localhost:3000/api';
let allTherapists = [];
let currentUser = null;
let currentView = 'grid';
let itemsToShow = 12;
let currentFilters = {
    search: '',
    specialty: 'all',
    location: 'all',
    availability: 'all'
};

// DOM Elements
const therapistsGrid = document.getElementById('therapistsList');
const searchInput = document.getElementById('therapistSearch');
const searchClear = document.getElementById('searchClear');
const specialtyFilter = document.getElementById('specialtyFilter');
const locationFilter = document.getElementById('locationFilter');
const availabilityFilter = document.getElementById('availabilityFilter');
const resetBtn = document.getElementById('resetFilters');
const noResults = document.getElementById('noResults');
const resultsCount = document.getElementById('resultsCount');
const loadMoreBtn = document.getElementById('loadMore');
const activeFiltersContainer = document.getElementById('activeFilters');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchTherapists();
    setupEventListeners();
    setupViewToggle();
});

function setupEventListeners() {
    searchInput?.addEventListener('input', debounce(handleSearch, 300));
    searchClear?.addEventListener('click', clearSearch);
    specialtyFilter?.addEventListener('change', handleFilterChange);
    locationFilter?.addEventListener('change', handleFilterChange);
    availabilityFilter?.addEventListener('change', handleFilterChange);
    resetBtn?.addEventListener('click', resetFilters);
}

function setupViewToggle() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentView = btn.dataset.view;
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            therapistsGrid?.classList.toggle('list-view', currentView === 'list');
            renderTherapists(getFilteredTherapists().slice(0, itemsToShow));
        });
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearch() {
    currentFilters.search = searchInput?.value || '';
    updateActiveFilters();
    filterAndRender();
}

function handleFilterChange() {
    currentFilters.specialty = specialtyFilter?.value || 'all';
    currentFilters.location = locationFilter?.value || 'all';
    currentFilters.availability = availabilityFilter?.value || 'all';
    updateActiveFilters();
    filterAndRender();
}

function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
        currentFilters.search = '';
        updateActiveFilters();
        filterAndRender();
    }
}

function resetFilters() {
    if (searchInput) searchInput.value = '';
    if (specialtyFilter) specialtyFilter.value = 'all';
    if (locationFilter) locationFilter.value = 'all';
    if (availabilityFilter) availabilityFilter.value = 'all';
    
    currentFilters = {
        search: '',
        specialty: 'all',
        location: 'all',
        availability: 'all'
    };
    
    updateActiveFilters();
    filterAndRender();
}

function updateActiveFilters() {
    if (!activeFiltersContainer) return;
    
    const activeFilters = [];
    
    if (currentFilters.search) {
        activeFilters.push({ key: 'search', label: `Search: ${currentFilters.search}` });
    }
    if (currentFilters.specialty !== 'all') {
        const specialtyText = specialtyFilter?.options[specialtyFilter.selectedIndex]?.text;
        activeFilters.push({ key: 'specialty', label: specialtyText || currentFilters.specialty });
    }
    if (currentFilters.location !== 'all') {
        const locationText = locationFilter?.options[locationFilter.selectedIndex]?.text;
        activeFilters.push({ key: 'location', label: locationText || currentFilters.location });
    }
    if (currentFilters.availability !== 'all') {
        const availabilityText = availabilityFilter?.options[availabilityFilter.selectedIndex]?.text;
        activeFilters.push({ key: 'availability', label: availabilityText || currentFilters.availability });
    }
    
    if (activeFilters.length === 0) {
        activeFiltersContainer.innerHTML = '';
        activeFiltersContainer.style.display = 'none';
        return;
    }
    
    activeFiltersContainer.style.display = 'flex';
    activeFiltersContainer.innerHTML = activeFilters.map(filter => `
        <span class="filter-tag">
            ${filter.label}
            <i class="fas fa-times" onclick="removeFilter('${filter.key}')"></i>
        </span>
    `).join('');
}

function removeFilter(key) {
    switch(key) {
        case 'search':
            clearSearch();
            break;
        case 'specialty':
            if (specialtyFilter) specialtyFilter.value = 'all';
            currentFilters.specialty = 'all';
            break;
        case 'location':
            if (locationFilter) locationFilter.value = 'all';
            currentFilters.location = 'all';
            break;
        case 'availability':
            if (availabilityFilter) availabilityFilter.value = 'all';
            currentFilters.availability = 'all';
            break;
    }
    updateActiveFilters();
    filterAndRender();
}

function filterAndRender() {
    const filtered = getFilteredTherapists();
    const displayTherapists = filtered.slice(0, itemsToShow);
    
    renderTherapists(displayTherapists);
    
    // Show/hide load more button
    if (loadMoreBtn) {
        loadMoreBtn.style.display = filtered.length > itemsToShow ? 'block' : 'none';
    }
}

function getFilteredTherapists() {
    return allTherapists.filter(therapist => {
        // Search filter
        const matchesSearch = currentFilters.search === '' || 
            therapist.name.toLowerCase().includes(currentFilters.search.toLowerCase()) || 
            therapist.title.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
            therapist.bio.toLowerCase().includes(currentFilters.search.toLowerCase());
        
        // Specialty filter
        const matchesSpecialty = currentFilters.specialty === 'all' || 
            therapist.specialties.some(s => s.toLowerCase().includes(currentFilters.specialty.toLowerCase()));
        
        // Location filter
        const matchesLocation = currentFilters.location === 'all' || 
            therapist.location === currentFilters.location;
        
        // Availability filter
        let matchesAvailability = true;
        if (currentFilters.availability === 'online') {
            matchesAvailability = therapist.onlineStatus === 'online';
        }
        
        return matchesSearch && matchesSpecialty && matchesLocation && matchesAvailability;
    });
}

// Fetch therapists from database
async function fetchTherapists() {
    try {
        showLoading();
        
        const response = await fetch(`${API_URL}/therapists`);
        const therapistsData = await response.json();
        
        allTherapists = therapistsData.map(t => ({
            id: t.user_id,
            name: t.full_name,
            title: t.specialization || 'Licensed Therapist',
            bio: t.bio || 'Experienced therapist dedicated to your mental wellness.',
            rating: 4.8,
            reviewCount: Math.floor(Math.random() * 100) + 20,
            onlineStatus: t.is_available ? 'online' : 'offline',
            location: 'online',
            languages: ['English', 'Swahili'],
            specialties: t.specialization ? t.specialization.split(',').map(s => s.trim()) : ['Mental Health Counseling'],
            image: t.profile_image || '../assets/images/default-therapist.jpg',
            experience: t.years_experience || 5,
            hourly_rate: t.hourly_rate || 80,
            email: t.email
        }));
        
        updateStats();
        filterAndRender();
        
    } catch (error) {
        console.error('Error fetching therapists:', error);
        showError();
    }
}

function updateStats() {
    const totalTherapistsStat = document.getElementById('totalTherapistsStat');
    const avgExperienceStat = document.getElementById('avgExperienceStat');
    const avgRatingStat = document.getElementById('avgRatingStat');
    
    if (totalTherapistsStat) {
        totalTherapistsStat.textContent = `${allTherapists.length}+`;
    }
    
    if (avgExperienceStat && allTherapists.length) {
        const avgExp = Math.round(allTherapists.reduce((sum, t) => sum + t.experience, 0) / allTherapists.length);
        avgExperienceStat.textContent = `${avgExp}+`;
    }
    
    if (avgRatingStat && allTherapists.length) {
        const avgRating = (allTherapists.reduce((sum, t) => sum + t.rating, 0) / allTherapists.length).toFixed(1);
        avgRatingStat.textContent = avgRating;
    }
}

function showLoading() {
    if (therapistsGrid) {
        therapistsGrid.innerHTML = `
            <div class="loading-skeleton">
                ${Array(6).fill().map(() => '<div class="skeleton-card"></div>').join('')}
            </div>
        `;
    }
}

function showError() {
    if (therapistsGrid) {
        therapistsGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Unable to Load Therapists</h3>
                    <p>Please check your connection and try again</p>
                    <button onclick="location.reload()" class="btn-primary">Retry</button>
                </div>
            </div>
        `;
    }
}

function renderTherapists(therapistsToShow) {
    if (!therapistsGrid) return;
    
    if (therapistsToShow.length === 0) {
        therapistsGrid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (resultsCount) resultsCount.textContent = '0 therapists found';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    if (resultsCount) {
        resultsCount.textContent = `Showing ${therapistsToShow.length} of ${getFilteredTherapists().length} therapists`;
    }
    
    therapistsGrid.innerHTML = therapistsToShow.map(therapist => `
        <div class="therapist-card" data-id="${therapist.id}" data-aos="fade-up">
            <div class="therapist-online-badge">
                <div class="online-status">
                    <span class="status-dot ${therapist.onlineStatus}"></span>
                    <span>${therapist.onlineStatus === 'online' ? 'Online Now' : 'Offline'}</span>
                </div>
            </div>
            <div class="therapist-image">
                <img src="${therapist.image}" alt="${therapist.name}" 
                     onerror="this.src='../assets/images/default-therapist.jpg'"
                     loading="lazy">
                <div class="therapist-badge">${therapist.experience}+ years</div>
            </div>
            <div class="therapist-info">
                <h3>${escapeHtml(therapist.name)}</h3>
                <p class="therapist-title">${escapeHtml(therapist.title)}</p>
                <div class="therapist-rating">
                    <span class="stars">${'★'.repeat(Math.floor(therapist.rating))}${'☆'.repeat(5 - Math.floor(therapist.rating))}</span>
                    <span class="rating-number">${therapist.rating}</span>
                    <span class="review-count">(${therapist.reviewCount} reviews)</span>
                </div>
                <p class="therapist-bio">${escapeHtml(therapist.bio.substring(0, 100))}...</p>
                <div class="therapist-specialties">
                    ${therapist.specialties.slice(0, 3).map(s => `<span class="specialty-tag">${escapeHtml(s)}</span>`).join('')}
                </div>
                <div class="therapist-details">
                    <span><i class="fas fa-map-marker-alt"></i> Online</span>
                    <span><i class="fas fa-language"></i> ${therapist.languages[0]}</span>
                    <span><i class="fas fa-coin"></i> KSh ${therapist.hourly_rate}/hr</span>
                </div>
                <div class="therapist-actions-large">
                    <button class="action-btn video-btn" onclick="handleAction('video', ${therapist.id})">
                        <i class="fas fa-video"></i>
                        <span>Video Call</span>
                    </button>
                    <button class="action-btn message-btn" onclick="handleAction('message', ${therapist.id})">
                        <i class="fas fa-comment-dots"></i>
                        <span>Message</span>
                    </button>
                    <button class="action-btn book-btn" onclick="handleAction('book', ${therapist.id})">
                        <i class="fas fa-calendar-check"></i>
                        <span>Book</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Re-initialize AOS for new elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Action handlers
async function handleAction(action, therapistId) {
    const therapist = allTherapists.find(t => t.id === therapistId);
    if (!therapist) return;
    
    const user = getCurrentUser();
    
    if (!user) {
        showLoginModal(`Please log in to ${action} with ${therapist.name}`);
        return;
    }
    
    switch(action) {
        case 'video':
            handleVideoCall(therapistId);
            break;
        case 'message':
            window.location.href = `messaging.html?therapist=${therapistId}`;
            break;
        case 'book':
            sessionStorage.setItem('bookingTherapist', JSON.stringify(therapist));
            window.location.href = `booking.html?therapist=${therapistId}`;
            break;
    }
}

async function handleVideoCall(therapistId) {
    const user = getCurrentUser();
    
    try {
        const response = await fetch(`${API_URL}/video/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                therapist_id: therapistId,
                client_id: user.id
            })
        });
        
        const session = await response.json();
        
        if (session.room_name) {
            window.location.href = `video-call.html?room=${session.room_name}&role=client`;
        } else {
            showNotification('Please book a session first before starting a video call', 'info');
        }
    } catch (error) {
        console.error('Error starting video call:', error);
        showNotification('Unable to start video call. Please try again.', 'error');
    }
}

// Auth helpers
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function checkAuth() {
    currentUser = getCurrentUser();
    updateUIForAuth();
}

function updateUIForAuth() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const dashboardLink = document.getElementById('dashboardLink');
    
    if (currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userNameDisplay) userNameDisplay.textContent = currentUser.full_name;
        
        // Set dashboard link based on role
        if (dashboardLink) {
            if (currentUser.role === 'admin') {
                dashboardLink.href = 'admin/dashboard.html';
            } else if (currentUser.role === 'therapist') {
                dashboardLink.href = 'therapist/dashboard.html';
            } else {
                dashboardLink.href = 'client/dashboard.html';
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// Login modal
function showLoginModal(message) {
    let modal = document.getElementById('loginPromptModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loginPromptModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content prompt-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-lock"></i> Login Required</h3>
                    <button class="close-modal" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal()" class="btn-outline">Cancel</button>
                    <a href="login.html" class="btn-primary">Login / Sign Up</a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('loginPromptModal');
    if (modal) modal.style.display = 'none';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global for onclick handlers
window.handleAction = handleAction;
window.removeFilter = removeFilter;
window.closeModal = closeModal;