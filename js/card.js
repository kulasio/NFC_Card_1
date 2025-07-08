// card.js
async function fetchCardData(cardUid) {
    const res = await fetch(`https://onetapp-backend.onrender.com/api/cards/dynamic/${cardUid}`);
    if (!res.ok) throw new Error('Card is not found');
    return await res.json();
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function bufferToBase64(buffer) {
    // Convert Buffer { data: [...] } to base64 string
    return btoa(String.fromCharCode.apply(null, buffer));
}

function renderProfile(profile, user) {
    // Profile name with certificate icon
    const profileNameElement = document.getElementById('profileName');
    const name = profile?.fullName || user.username || '';
    
    // Show certificate icon only if verified
    const certificateIcon = profile?.verificationStatus?.type === 'verified' 
        ? '<span class="text-warning"><i class="fas fa-certificate"></i></span>' 
        : '';
    profileNameElement.innerHTML = `${name} ${certificateIcon}`;
    
    // Profile title
    document.getElementById('profileTitle').textContent = profile?.jobTitle || '';
    
    // Profile location (using company or location if available)
    const location = profile?.company || profile?.contact?.location || '';
    document.getElementById('profileLocation').textContent = location;
    
    // Profile bio
    document.getElementById('profileBio').textContent = profile?.bio || '';
    
    // Profile image
    const profileImg = document.getElementById('profilePicture');
    let imgData = profile?.profileImage?.data;
    if (imgData) {
        if (typeof imgData === 'object' && Array.isArray(imgData.data)) {
            // Handle Buffer { data: [...] }
            imgData = bufferToBase64(imgData.data);
        }
        if (typeof imgData === 'string') {
            profileImg.src = `data:${profile.profileImage.contentType};base64,${imgData}`;
        } else {
            profileImg.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&w=400&h=600&q=80';
        }
    } else {
        profileImg.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&w=400&h=600&q=80';
    }
    
    // Social links
    const socialLinks = profile?.socialLinks || {};
    const socialIcons = {
        linkedin: 'fab fa-linkedin',
        github: 'fab fa-github',
        twitter: 'fab fa-twitter',
        facebook: 'fab fa-facebook',
        instagram: 'fab fa-instagram',
        tiktok: 'fab fa-tiktok',
        youtube: 'fab fa-youtube',
        whatsapp: 'fab fa-whatsapp',
        telegram: 'fab fa-telegram',
        snapchat: 'fab fa-snapchat',
        pinterest: 'fab fa-pinterest',
        reddit: 'fab fa-reddit',
        website: 'fas fa-globe',
        other: 'fas fa-link'
    };
    
    const socialLinksDiv = document.getElementById('socialLinks');
    socialLinksDiv.innerHTML = '';
    Object.entries(socialIcons).forEach(([key, icon]) => {
        if (socialLinks[key]) {
            const a = document.createElement('a');
            a.href = socialLinks[key];
            a.target = '_blank';
            a.innerHTML = `<i class='${icon}'></i>`;
            socialLinksDiv.appendChild(a);
        }
    });
}

function renderActions(profile, user) {
    const actionsDiv = document.getElementById('actionButtons');
    actionsDiv.style.display = '';
    actionsDiv.innerHTML = '';
    
    // Save Contact (vCard)
    if (profile?.contact?.email || user.email) {
        actionsDiv.innerHTML += `<button id="saveContactBtn" class="btn btn-dark w-50"><i class="fas fa-address-card me-2"></i>Save contact</button>`;
    }
    
    // Book now or Visit Website
    if (profile?.website) {
        actionsDiv.innerHTML += `<a href="${profile.website}" target="_blank" class="btn btn-dark w-50"><i class="fas fa-calendar-alt me-2"></i>Book now</a>`;
    } else if (profile?.contact?.email || user.email) {
        const email = profile?.contact?.email || user.email;
        actionsDiv.innerHTML += `<a href="mailto:${email}" class="btn btn-dark w-50"><i class="fas fa-envelope me-2"></i>Send Email</a>`;
    }
    
    // Add Save Contact logic
    setTimeout(() => {
        const saveBtn = document.getElementById('saveContactBtn');
        if (saveBtn) {
            saveBtn.onclick = function() {
                const vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${profile?.fullName || user.username}\\nFN:${profile?.fullName || user.username}\nTITLE:${profile?.jobTitle || ''}\nORG:${profile?.company || ''}\nEMAIL;type=WORK,INTERNET:${profile?.contact?.email || user.email}\nTEL;type=WORK,VOICE:${profile?.contact?.phone || ''}\nURL:${profile?.website || ''}\nNOTE:Digital NFC Card\nEND:VCARD`;
                const blob = new Blob([vcard], { type: 'text/vcard' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${profile?.fullName || user.username}.vcf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
        }
    }, 100);
}

function renderFeaturedLinks(profile, user) {
    const featuredLinksDiv = document.getElementById('featuredLinks');
    const modalFeaturedLinksDiv = document.getElementById('modalFeaturedLinks');
    
    // Get featured links from database
    const featuredLinks = profile?.featuredLinks || [];
    
    // If no featured links in database, create some from available data
    if (featuredLinks.length === 0) {
        if (profile?.website) {
            featuredLinks.push({ label: 'My resume', url: profile.website, icon: 'fas fa-file-alt' });
        }
        if (profile?.contact?.email || user.email) {
            featuredLinks.push({ label: 'Subscribe to Mailing List', url: `mailto:${profile?.contact?.email || user.email}`, icon: 'fas fa-envelope' });
        }
        if (profile?.socialLinks?.linkedin) {
            featuredLinks.push({ label: 'Portfolio', url: profile.socialLinks.linkedin, icon: 'fab fa-linkedin' });
        }
        if (profile?.contact?.phone) {
            featuredLinks.push({ label: 'Book a Call', url: `tel:${profile.contact.phone}`, icon: 'fas fa-phone' });
        }
        if (profile?.socialLinks?.website) {
            featuredLinks.push({ label: 'My Blog', url: profile.socialLinks.website, icon: 'fas fa-blog' });
        }
    }
    
    // Sort by order if available
    featuredLinks.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Render featured links
    featuredLinksDiv.innerHTML = '';
    modalFeaturedLinksDiv.innerHTML = '';
    
    featuredLinks.forEach((link, index) => {
        if (index < 3) {
            // Show first 3 in main view
            featuredLinksDiv.innerHTML += `<a href="${link.url}" class="btn">${link.label}</a>`;
        }
        // Add all to modal
        modalFeaturedLinksDiv.innerHTML += `<a href="${link.url}" class="btn btn-light">${link.label}</a>`;
    });
    
    // Add "more" button if there are more than 3 links
    if (featuredLinks.length > 3) {
        featuredLinksDiv.innerHTML += `<button class="badge bg-light text-dark px-3 py-2 border-0" style="font-size:0.97rem; border-radius:0.7rem; display: flex; align-items: center; cursor:pointer;" data-bs-toggle="modal" data-bs-target="#addFeaturedModal" title="Show more featured links">+${featuredLinks.length - 3} more</button>`;
    }
}

function renderGallery(profile, user) {
    const galleryDiv = document.getElementById('gallerySection');
    
    // Get gallery items from database
    const galleryItems = profile?.gallery || [];
    
    // Sort by order if available
    galleryItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // If no gallery items in database, show empty state
    if (galleryItems.length === 0) {
        galleryDiv.innerHTML = '<div class="empty-state">No gallery items available</div>';
        return;
    }
    
    galleryDiv.innerHTML = '';
    galleryItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.style.position = 'relative';
        
        const imageUrl = item.thumbnail || item.url;
        const isVideo = item.type === 'video';
        
        if (isVideo) {
            itemDiv.innerHTML = `
                <img src="${imageUrl}" alt="${item.title || 'Video'}" />
                <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: white; background: rgba(0,0,0,0.5); border-radius: 50%; padding: 0.3em 0.45em;">
                    <i class="fas fa-play"></i>
                </span>
                <div style="font-size: 0.9rem; color: #333; text-align: center;">${item.title || 'Video'}</div>
            `;
        } else {
            itemDiv.innerHTML = `
                <img src="${imageUrl}" alt="${item.title || 'Gallery Item'}" />
                <div style="font-size: 0.9rem; color: #333; text-align: center;">${item.title || 'Gallery Item'}</div>
            `;
        }
        
        // Add click handler if URL is provided
        if (item.url) {
            itemDiv.style.cursor = 'pointer';
            itemDiv.onclick = () => {
                if (item.type === 'video') {
                    window.open(item.url, '_blank');
                } else {
                    window.open(item.url, '_blank');
                }
            };
        }
        
        galleryDiv.appendChild(itemDiv);
    });
}

function renderRecentActivity(profile, user) {
    const recentActivityDiv = document.getElementById('recentActivity');
    
    // Get recent activity from database
    const activities = profile?.recentActivity || [];
    
    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // If no activities in database, show empty state
    if (activities.length === 0) {
        recentActivityDiv.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
    }
    
    recentActivityDiv.innerHTML = '';
    activities.forEach(activity => {
        const activityDate = activity.date ? new Date(activity.date).toLocaleDateString() : '';
        const activityText = activity.url 
            ? `<a href="${activity.url}" class="text-primary text-decoration-underline">${activity.title}</a>`
            : activity.title;
            
        recentActivityDiv.innerHTML += `
            <div class="recent-activity-item">
                <i class="${activity.icon || 'fas fa-info-circle'} recent-activity-icon"></i>
                <span>${activity.description || activityText} ${activityDate ? `<small class="text-muted">(${activityDate})</small>` : ''}</span>
            </div>
        `;
    });
}

async function main() {
    const cardUid = getQueryParam('cardUid');
    if (!cardUid) {
        alert('No cardUid specified in URL.');
        return;
    }
    
    try {
        const { card, user, profile } = (await fetchCardData(cardUid));
        renderProfile(profile, user);
        renderActions(profile, user);
        renderFeaturedLinks(profile, user);
        renderGallery(profile, user);
        renderRecentActivity(profile, user);
    } catch (err) {
        document.body.innerHTML = '<div style="color:white;text-align:center;margin-top:3rem;font-size:1.5rem;">Card not found or error loading card data.</div>';
    }
}

main();
