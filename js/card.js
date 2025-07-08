// card.js

// Helper: Get cardUid from URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Fetch card data from backend
async function fetchCardData(cardUid) {
    const res = await fetch('http://onetapp-backend.onrender.com/api/cards/dynamic/' + cardUid);
    if (!res.ok) throw new Error('Card not found');
    return await res.json();
}

// Populate the card fields
function populateCard(card) {
    // Profile image
    const img = document.getElementById('profileImage');
    img.src = card.profileImage || '';
    img.alt = card.fullName || 'Profile';

    // Name & verification
    document.getElementById('profileName').innerHTML = `${card.fullName || ''} <span class="text-warning" id="profileVerified">${card.verified ? '<i class=\'fas fa-certificate\'></i>' : ''}</span>`;

    // Title, location, bio
    document.getElementById('profileTitle').textContent = card.title || '';
    document.getElementById('profileLocation').textContent = card.location || '';
    document.getElementById('profileBio').textContent = card.bio || '';

    // Social links
    const socialLinksDiv = document.getElementById('profileSocialLinks');
    socialLinksDiv.innerHTML = '';
    if (card.socialLinks) {
        for (const [platform, url] of Object.entries(card.socialLinks)) {
            if (url) {
                const iconMap = {
                    linkedin: 'fab fa-linkedin',
                    github: 'fab fa-github',
                    twitter: 'fab fa-twitter',
                    facebook: 'fab fa-facebook',
                    youtube: 'fab fa-youtube',
                    instagram: 'fab fa-instagram',
                    tiktok: 'fab fa-tiktok',
                    website: 'fas fa-globe',
                };
                const icon = iconMap[platform] || 'fas fa-link';
                socialLinksDiv.innerHTML += `<a href="${url}" target="_blank"><i class="${icon}"></i></a>`;
            }
        }
    }

    // Actions (e.g., Save contact, Book now)
    const actionsDiv = document.getElementById('profileActions');
    actionsDiv.innerHTML = '';
    if (card.actions) {
        card.actions.forEach(action => {
            actionsDiv.innerHTML += `<button class="btn btn-dark w-50">${action.icon ? `<i class='${action.icon} me-2'></i>` : ''}${action.label}</button>`;
        });
    }

    // Featured links
    const featuredDiv = document.getElementById('profileFeaturedLinks');
    featuredDiv.innerHTML = '';
    if (card.featuredLinks) {
        card.featuredLinks.slice(0, 3).forEach(link => {
            featuredDiv.innerHTML += `<a href="${link.url}" class="btn">${link.label}</a>`;
        });
        if (card.featuredLinks.length > 3) {
            featuredDiv.innerHTML += `<button class="badge bg-light text-dark px-3 py-2 border-0" style="font-size:0.97rem; border-radius:0.7rem; display: flex; align-items: center; cursor:pointer;" data-bs-toggle="modal" data-bs-target="#addFeaturedModal" title="Show more featured links">+${card.featuredLinks.length - 3} more</button>`;
        }
    }
    // All featured links in modal
    const allFeaturedDiv = document.getElementById('profileAllFeaturedLinks');
    allFeaturedDiv.innerHTML = '';
    if (card.featuredLinks) {
        card.featuredLinks.forEach(link => {
            allFeaturedDiv.innerHTML += `<a href="${link.url}" class="btn btn-light">${link.label}</a>`;
        });
    }

    // Gallery
    const galleryDiv = document.getElementById('profileGallery');
    galleryDiv.innerHTML = '';
    if (card.gallery) {
        card.gallery.forEach(item => {
            galleryDiv.innerHTML += `
                <div${item.video ? ' style="position: relative;"' : ''}>
                    <img src="${item.img}" alt="${item.caption || ''}" />
                    ${item.video ? `<span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: white; background: rgba(0,0,0,0.5); border-radius: 50%; padding: 0.3em 0.45em;"><i class='fas fa-play'></i></span>` : ''}
                    <div style="font-size: 0.9rem; color: #333; text-align: center;">${item.caption || ''}</div>
                </div>
            `;
        });
    }

    // Recent activity
    const activityDiv = document.getElementById('profileRecentActivity');
    activityDiv.innerHTML = '';
    if (card.recentActivity) {
        card.recentActivity.forEach(item => {
            activityDiv.innerHTML += `<div class="recent-activity-item"><i class="${item.icon} recent-activity-icon"></i><span>${item.text}</span></div>`;
        });
    }
}

// Main
(async function() {
    const cardUid = getQueryParam('cardUid');
    if (!cardUid) {
        document.body.innerHTML = '<div style="color:#333;text-align:center;margin-top:3rem;font-size:1.5rem;">No cardUid specified in URL.</div>';
        return;
    }
    try {
        const card = await fetchCardData(cardUid);
        populateCard(card);
    } catch (err) {
        document.body.innerHTML = '<div style="color:#333;text-align:center;margin-top:3rem;font-size:1.5rem;">Card not found or error loading card data.</div>';
    }
})();
