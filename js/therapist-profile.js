/**
 * Therapist Profile Module – loads therapist data, renders UI, opens booking modal
 */
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const therapistId = parseInt(urlParams.get('id'));
    const therapist = therapists.find(t => t.id === therapistId);

    const container = document.getElementById('profileContainer');
    const modal = document.getElementById('bookingModal');

    if (!therapist) {
        container.innerHTML = '<p class="error">Therapist not found. <a href="therapists.html">Browse all therapists</a></p>';
        return;
    }

    // Render profile
    container.innerHTML = `
        <div class="profile-sidebar">
            <div class="profile-avatar"><img src="${therapist.image}" alt="${therapist.name}"></div>
            <h2>${therapist.name}</h2>
            <div class="profile-title">${therapist.title}</div>
            <div class="profile-rating">⭐ ${therapist.rating} (${therapist.reviewCount} reviews)</div>
            <div class="profile-contact">
                <div class="contact-item"><i class="fas fa-map-marker-alt"></i> ${therapist.location === 'online' ? 'Online' : therapist.location.charAt(0).toUpperCase() + therapist.location.slice(1)}</div>
                <div class="contact-item"><i class="fas fa-language"></i> ${therapist.languages.join(', ')}</div>
                <div class="contact-item"><i class="fas fa-video"></i> ${therapist.availability}</div>
                <div class="contact-item"><i class="fas fa-clock"></i> ${therapist.experience}+ years experience</div>
            </div>
            <div class="profile-buttons">
                <button class="btn btn-primary" id="bookBtn">Book Session</button>
                <a href="messaging.html?therapist=${therapist.id}" class="btn btn-outline">Send Message</a>
            </div>
        </div>
        <div class="profile-main">
            <div class="profile-section">
                <h3><i class="fas fa-user-md"></i> About</h3>
                <p>${therapist.bio}</p>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-stethoscope"></i> Specialties</h3>
                <div class="specialties-list">${therapist.specialties.map(s => `<span class="specialty-badge">${s}</span>`).join('')}</div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-graduation-cap"></i> Experience</h3>
                <p>${therapist.experience}+ years of clinical experience</p>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-comments"></i> Approach</h3>
                <p>${therapist.title} uses evidence-based techniques tailored to your unique needs. Sessions are collaborative, compassionate, and goal-oriented.</p>
            </div>
        </div>
    `;

    // Setup booking modal
    const bookBtn = document.getElementById('bookBtn');
    const closeModal = modal.querySelector('.modal-close');

    bookBtn.addEventListener('click', () => {
        modal.classList.add('active');
        BookingManager.init(modal, therapist);
    });

    closeModal.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});