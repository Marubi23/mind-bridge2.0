/**
 * ============================================
 * MINDBRIDGE KENYA - MAIN APPLICATION
 * Built on Marubi-Labs Architecture
 * Version: 2.0.0
 * ============================================
 */

// ===== DOM Elements =====
const navbar = document.getElementById('navbar');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.nav-menu');
const sosButton = document.getElementById('sosButton');
const emergencyModal = document.getElementById('emergencyModal');
const startQuizBtn = document.getElementById('startQuizBtn');

// ===== Scroll Handler =====
let lastScroll = 0;
const scrollThreshold = 50;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Add scrolled class to navbar
    if (currentScroll > scrollThreshold) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Hide/show navbar on scroll
    if (currentScroll > lastScroll && currentScroll > scrollThreshold) {
        navbar.classList.add('hide');
    } else if (currentScroll < lastScroll) {
        navbar.classList.remove('hide');
    }
    
    lastScroll = currentScroll;
});

// ===== Theme Manager =====
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('mindbridge-theme') || 'light';
        this.init();
    }
    
    init() {
        this.applyTheme(this.theme);
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('mindbridge-theme', theme);
        this.theme = theme;
    }
    
    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
}

// ===== Mobile Menu =====
if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });
    
    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// ===== SOS Emergency Modal =====
if (sosButton && emergencyModal) {
    sosButton.addEventListener('click', () => {
        emergencyModal.classList.add('active');
    });
    
    const closeModal = () => {
        emergencyModal.classList.remove('active');
    };
    
    document.querySelectorAll('.modal-close, .close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    emergencyModal.addEventListener('click', (e) => {
        if (e.target === emergencyModal) closeModal();
    });
}

// ===== Counter Animation =====
const animateNumbers = () => {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                const target = parseInt(entry.target.dataset.target);
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                
                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        entry.target.textContent = Math.round(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        entry.target.textContent = target;
                        entry.target.classList.add('animated');
                    }
                };
                
                requestAnimationFrame(updateCounter);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
};

// ===== Scroll Reveal =====
const setupScrollReveal = () => {
    const revealElements = document.querySelectorAll('.program-card, .resource-card, .impact-story, .quiz-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    revealElements.forEach(el => observer.observe(el));
};

// ===== Newsletter Form =====
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input').value;
        
        if (email && isValidEmail(email)) {
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Thanks for subscribing!';
            successMsg.style.cssText = `
                background: var(--secondary);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                font-size: 0.875rem;
            `;
            newsletterForm.appendChild(successMsg);
            newsletterForm.reset();
            
            setTimeout(() => successMsg.remove(), 3000);
        }
    });
}

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===== Helper Functions =====
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== Initialize Everything =====
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    animateNumbers();
    setupScrollReveal();
    
    // Add animation classes
    document.querySelectorAll('.program-card, .resource-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    console.log('MindBridge Kenya initialized successfully');
});