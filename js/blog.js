/**
 * Blog Page Functionality
 * Load more posts, newsletter signup
 */

document.addEventListener('DOMContentLoaded', () => {
    // Load More functionality
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    let visiblePosts = 6;
    const allPosts = document.querySelectorAll('.blog-card');
    const totalPosts = allPosts.length;
    
    // Initially hide posts beyond first 6
    for (let i = 6; i < totalPosts; i++) {
        allPosts[i].style.display = 'none';
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            let newVisible = visiblePosts + 3;
            for (let i = visiblePosts; i < newVisible && i < totalPosts; i++) {
                allPosts[i].style.display = 'block';
            }
            visiblePosts = newVisible;
            
            if (visiblePosts >= totalPosts) {
                loadMoreBtn.style.display = 'none';
            }
        });
    }
    
    // Newsletter signup
    const newsletterForm = document.getElementById('blogNewsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input').value;
            if (email) {
                alert('Thank you for subscribing! You\'ll receive our newsletter soon.');
                newsletterForm.reset();
            }
        });
    }
});