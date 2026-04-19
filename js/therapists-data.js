const therapists = [
    {
        id: 1,
        name: "Dr. Sarah Wanjiku",
        title: "Clinical Psychologist",
        specialty: "anxiety",
        specialties: ["Anxiety & Depression", "Trauma & PTSD"],
        location: "nairobi",
        experience: 12,
        rating: 4.9,
        reviewCount: 128,
        bio: "Dr. Sarah specializes in helping teens and young adults navigate anxiety, depression, and life transitions.",
        image: "assets/images/IMG_1368.JPG",
        languages: ["English", "Swahili"],
        availability: "In-person & Online",
        sessionFee: "KES 3,500 - 5,000"
    },
    {
        id: 2,
        name: "Michael Otieno",
        title: "Counseling Psychologist",
        specialty: "youth",
        specialties: ["Youth & Adolescent", "Family Therapy"],
        location: "kisumu",
        experience: 8,
        rating: 4.8,
        reviewCount: 94,
        bio: "Michael has worked with hundreds of teenagers in schools across Kisumu, helping them build resilience.",
        image: "assets/images/IMG_1371.JPG",
        languages: ["English", "Swahili", "Luo"],
        availability: "In-person & Online",
        sessionFee: "KES 3,000 - 4,500"
    },
    {
        id: 3,
        name: "Dr. Amina Hassan",
        title: "Psychiatrist",
        specialty: "trauma",
        specialties: ["Trauma & PTSD", "Anxiety & Depression"],
        location: "mombasa",
        experience: 15,
        rating: 4.9,
        reviewCount: 203,
        bio: "Dr. Amina is a board-certified psychiatrist specializing in trauma-informed care.",
        image: "assets/images/IMG_1369.JPG",
        languages: ["English", "Swahili", "Arabic"],
        availability: "In-person only",
        sessionFee: "KES 5,000 - 7,000"
    },
    {
        id: 4,
        name: "Grace Nderitu",
        title: "Family Therapist",
        specialty: "family",
        specialties: ["Family Therapy", "Youth & Adolescent"],
        location: "online",
        experience: 10,
        rating: 4.9,
        reviewCount: 156,
        bio: "Grace specializes in family dynamics, parent-teen communication, and relationship issues.",
        image: "assets/images/IMG_1367.JPG",
        languages: ["English", "Swahili", "Kikuyu"],
        availability: "Online only",
        sessionFee: "KES 3,500 - 5,500"
    }
];

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
        <div class="therapist-card">
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
                <p class="therapist-bio">${t.bio}</p>
                <div class="therapist-specialties">
                    ${t.specialties.map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                </div>
                <div class="therapist-details">
                    <span><i class="fas fa-map-marker-alt"></i> ${t.location === 'online' ? 'Online' : t.location.charAt(0).toUpperCase() + t.location.slice(1)}</span>
                    <span><i class="fas fa-language"></i> ${t.languages.join(', ')}</span>
                </div>
                <div class="therapist-footer">
                    <div class="session-fee">${t.sessionFee}</div>
                    <a href="contact.html?therapist=${t.id}" class="btn btn-primary btn-small">Book Session <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
    `).join('');
}

function filterTherapists() {
    const searchTerm = document.getElementById('therapistSearch')?.value.toLowerCase() || '';
    const specialty = document.getElementById('specialtyFilter')?.value || 'all';
    const location = document.getElementById('locationFilter')?.value || 'all';
    
    const filtered = therapists.filter(t => {
        const matchesSearch = searchTerm === '' || t.name.toLowerCase().includes(searchTerm) || t.specialties.some(s => s.toLowerCase().includes(searchTerm));
        const matchesSpecialty = specialty === 'all' || t.specialties.some(s => s.toLowerCase().includes(specialty));
        const matchesLocation = location === 'all' || t.location === location;
        return matchesSearch && matchesSpecialty && matchesLocation;
    });
    
    renderTherapists(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    renderTherapists(therapists);
    document.getElementById('therapistSearch')?.addEventListener('input', filterTherapists);
    document.getElementById('specialtyFilter')?.addEventListener('change', filterTherapists);
    document.getElementById('locationFilter')?.addEventListener('change', filterTherapists);
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        document.getElementById('therapistSearch').value = '';
        document.getElementById('specialtyFilter').value = 'all';
        document.getElementById('locationFilter').value = 'all';
        filterTherapists();
    });
    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
        document.getElementById('therapistSearch').value = '';
        document.getElementById('specialtyFilter').value = 'all';
        document.getElementById('locationFilter').value = 'all';
        filterTherapists();
    });
});