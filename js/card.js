// card.js

// Helper: Get cardUid from URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Convert Buffer to base64 string
function bufferToBase64(bufferObj) {
    if (!bufferObj || !bufferObj.data) return '';
    return btoa(String.fromCharCode(...bufferObj.data));
}

// Analytics and Tap Tracking Functions
const API_BASE_URL = 'https://onetapp-backend.onrender.com';

// Generate session ID for analytics
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get device and browser info
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
    };
}

// Get location data using hybrid approach
async function getLocationData() {
    let locationData = {
        latitude: null,
        longitude: null,
        accuracy: null,
        city: null,
        country: null,
        region: null,
        timezone: null,
        method: 'unknown'
    };

    // Try browser geolocation first
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                });
            });

            locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                method: 'browser_geolocation',
                timestamp: position.timestamp
            };

            // Try to get city/country from coordinates using reverse geocoding
            try {
                const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`);
                const geoData = await response.json();
                
                locationData.city = geoData.city || geoData.locality;
                locationData.country = geoData.countryName;
                locationData.region = geoData.principalSubdivision;
                locationData.timezone = geoData.timezone;
            } catch (geoError) {
                console.log('Reverse geocoding failed:', geoError);
            }

            return locationData;
        } catch (geoError) {
            console.log('Browser geolocation failed:', geoError);
        }
    }

    // Fallback to IP-based geolocation
    try {
        const response = await fetch('https://api.bigdatacloud.net/data/ip-geolocation-full');
        const ipData = await response.json();
        
        locationData = {
            latitude: ipData.location?.latitude,
            longitude: ipData.location?.longitude,
            city: ipData.location?.city,
            country: ipData.location?.country?.name,
            region: ipData.location?.principalSubdivision,
            timezone: ipData.location?.timeZone?.name,
            method: 'ip_geolocation',
            ip: ipData.ip
        };
    } catch (ipError) {
        console.log('IP geolocation failed:', ipError);
    }

    return locationData;
}

// Log tap event to backend
async function logTap(cardId, eventId = null) {
    try {
        const deviceInfo = getDeviceInfo();
        
        // Start location tracking in background (non-blocking)
        const locationPromise = getLocationData().catch(err => {
            console.log('Location tracking failed:', err);
            return {
                latitude: null,
                longitude: null,
                accuracy: null,
                city: null,
                country: null,
                region: null,
                timezone: null,
                method: 'unknown'
            };
        });
        
        const tapData = {
            cardId: cardId,
            eventId: eventId,
            timestamp: new Date(),
            ip: '',
            geo: {},
            userAgent: deviceInfo.userAgent,
            sessionId: generateSessionId(),
            actions: [{
                type: 'card_view',
                label: 'Card Viewed',
                timestamp: new Date()
            }]
        };

        // Send tap data immediately
        await fetch(`${API_BASE_URL}/api/taps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tapData)
        });
        console.log('Tap event logged successfully');
        
        // Update with location data in background
        locationPromise.then(locationData => {
            const updateData = {
                ...tapData,
                ip: locationData.ip || '',
                geo: locationData
            };
            
            // Update the tap log with location data
            fetch(`${API_BASE_URL}/api/taps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            }).catch(err => console.log('Location update failed:', err));
        });
        
    } catch (error) {
        console.log('Tap logging failed (non-critical):', error);
    }
}

// Log user action to backend
async function logUserAction(cardId, actionData) {
    try {
        const deviceInfo = getDeviceInfo();
        const locationData = await getLocationData();
        
        const actionLog = {
            cardId: cardId,
            timestamp: new Date(),
            ip: locationData.ip || '',
            geo: locationData,
            userAgent: deviceInfo.userAgent,
            sessionId: generateSessionId(),
            actions: [{
                type: actionData.type,
                label: actionData.label,
                url: actionData.url || '',
                timestamp: new Date()
            }]
        };

        await fetch(`${API_BASE_URL}/api/taps/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(actionLog)
        });
        console.log('User action logged successfully with location:', locationData);
    } catch (error) {
        console.log('Action logging failed (non-critical):', error);
    }
}

// Fetch card data from backend
async function fetchCardData(cardUid) {
    const res = await fetch(`${API_BASE_URL}/api/cards/dynamic/${cardUid}`);
    if (!res.ok) throw new Error('Card not found');
    return await res.json();
}

// Populate the card fields
function populateCard(apiData) {
    try {
        // Use profile, user, and card from backend response
        const { card, user, profile } = apiData;

        // Profile image
        const img = document.getElementById('profileImage');
        if (profile && profile.profileImage) {
            if (profile.profileImage.data && profile.profileImage.data.data) {
                // Buffer to base64
                const base64 = bufferToBase64({ data: profile.profileImage.data.data });
                img.src = `data:image/jpeg;base64,${base64}`;
            } else if (profile.profileImage.url) {
                // Direct URL from backend
                img.src = profile.profileImage.url;
            } else {
                img.src = 'https://via.placeholder.com/180x200?text=No+Image';
            }
        } else {
            img.src = 'https://via.placeholder.com/180x200?text=No+Image';
        }
        img.alt = profile?.fullName || user?.username || 'Profile';

        // Name & verification (assuming no verification field, just show name)
        document.getElementById('profileName').innerHTML = `${profile?.fullName || user?.username || ''}`;

        // Title, location, bio
        document.getElementById('profileTitle').textContent = profile?.jobTitle || '';
        document.getElementById('profileLocation').textContent = profile?.location || '';
        document.getElementById('profileBio').textContent = profile?.bio || '';

        // Social links
        const socialLinksDiv = document.getElementById('profileSocialLinks');
        socialLinksDiv.innerHTML = '';
        if (profile?.socialLinks) {
            for (const [platform, url] of Object.entries(profile.socialLinks)) {
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
                    const linkElement = document.createElement('a');
                    linkElement.href = url;
                    linkElement.target = '_blank';
                    linkElement.innerHTML = `<i class="${icon}"></i>`;
                    
                    // Add click tracking for social links with specific platform name
                    linkElement.addEventListener('click', function() {
                        if (card?._id) {
                            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
                            logUserAction(card._id, {
                                type: 'social_link_click',
                                label: `${platformName} Profile Clicked`,
                                url: url
                            });
                        }
                    });
                    
                    socialLinksDiv.appendChild(linkElement);
                }
            }
        }

        // Actions (e.g., Save contact, Book now)
        const actionsDiv = document.getElementById('profileActions');
        actionsDiv.innerHTML = '';
        // Add Save Contact button if email exists
        if (profile?.contact?.email || user?.email) {
            actionsDiv.innerHTML += `<button id="saveContactBtn" class="btn btn-dark w-50"><i class='fas fa-address-card me-2'></i>Save contact</button>`;
        }
        // Add Book Now button to open modal
        if (profile?.contact?.email || user?.email) {
            actionsDiv.innerHTML += `<button id="bookNowBtn" class="btn btn-dark w-50"><i class='fas fa-calendar-alt me-2'></i>Book now</button>`;
        }

        // Attach the click handler for Save Contact button
        const saveBtn = document.getElementById('saveContactBtn');
        if (saveBtn) {
            saveBtn.onclick = function() {
                // Log the contact save action with person's name
                if (card?._id) {
                    const personName = profile?.fullName || user?.username || 'Unknown';
                    logUserAction(card._id, {
                        type: 'contact_save',
                        label: `Contact Saved: "${personName}"`,
                        url: ''
                    });
                }
                
                const vcard = `
BEGIN:VCARD
VERSION:3.0
N:${profile?.fullName || user?.username || ''}
FN:${profile?.fullName || user?.username || ''}
TITLE:${profile?.jobTitle || ''}
ORG:${profile?.company || ''}
EMAIL;type=WORK,INTERNET:${profile?.contact?.email || user?.email || ''}
TEL;type=WORK,VOICE:${profile?.contact?.phone || ''}
NOTE:Saved from NFC Card
END:VCARD
                `.trim();
                const blob = new Blob([vcard], { type: 'text/vcard' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${profile?.fullName || user?.username || 'contact'}.vcf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
        }

        // Attach the click handler for Book Now button to open modal
        const bookNowBtn = document.getElementById('bookNowBtn');
        if (bookNowBtn) {
            bookNowBtn.onclick = function() {
                // Log the booking modal action with person's name
                if (card?._id) {
                    const personName = profile?.fullName || user?.username || 'Unknown';
                    logUserAction(card._id, {
                        type: 'booking_modal_open',
                        label: `Booking Modal Opened for: "${personName}"`,
                        url: ''
                    });
                }
                const modal = new bootstrap.Modal(document.getElementById('bookNowModal'));
                modal.show();
            };
        }

        // Handle booking form submission
        const bookNowForm = document.getElementById('bookNowForm');
        if (bookNowForm) {
            bookNowForm.onsubmit = function(e) {
                e.preventDefault();
                
                // Log the booking submission action with person's name
                if (card?._id) {
                    const personName = profile?.fullName || user?.username || 'Unknown';
                    logUserAction(card._id, {
                        type: 'booking_submitted',
                        label: `Meeting Request Submitted for: "${personName}"`,
                        url: ''
                    });
                }
                
                document.getElementById('bookNowThankYou').style.display = '';
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bookNowModal'));
                    if (modal) modal.hide();
                    bookNowForm.reset();
                    document.getElementById('bookNowThankYou').style.display = 'none';
                }, 2000);
            };
        }

        // Featured links
        const featuredDiv = document.getElementById('profileFeaturedLinks');
        featuredDiv.innerHTML = '';
        if (profile?.featuredLinks) {
            profile.featuredLinks.slice(0, 3).forEach(link => {
                const linkElement = document.createElement('a');
                linkElement.href = link.url;
                linkElement.className = 'btn';
                linkElement.textContent = link.label;
                
                // Add click tracking for featured links with specific link name
                linkElement.addEventListener('click', function() {
                    if (card?._id) {
                        logUserAction(card._id, {
                            type: 'featured_link_click',
                            label: `Featured Link Clicked: "${link.label}"`,
                            url: link.url
                        });
                    }
                });
                
                featuredDiv.appendChild(linkElement);
            });
            if (profile.featuredLinks.length > 3) {
                const moreBtn = document.createElement('button');
                moreBtn.className = 'badge bg-light text-dark px-3 py-2 border-0';
                moreBtn.style.cssText = 'font-size:0.97rem; border-radius:0.7rem; display: flex; align-items: center; cursor:pointer;';
                moreBtn.setAttribute('data-bs-toggle', 'modal');
                moreBtn.setAttribute('data-bs-target', '#addFeaturedModal');
                moreBtn.title = 'Show more featured links';
                moreBtn.textContent = `+${profile.featuredLinks.length - 3} more`;
                
                // Add click tracking for "show more" button
                moreBtn.addEventListener('click', function() {
                    if (card?._id) {
                        logUserAction(card._id, {
                            type: 'featured_links_modal_open',
                            label: 'Featured Links Modal Opened',
                            url: ''
                        });
                    }
                });
                
                featuredDiv.appendChild(moreBtn);
            }
        }
        // All featured links in modal
        const allFeaturedDiv = document.getElementById('profileAllFeaturedLinks');
        allFeaturedDiv.innerHTML = '';
        if (profile?.featuredLinks) {
            profile.featuredLinks.forEach(link => {
                const linkElement = document.createElement('a');
                linkElement.href = link.url;
                linkElement.className = 'btn btn-light';
                linkElement.textContent = link.label;
                
                // Add click tracking for modal featured links with specific link name
                linkElement.addEventListener('click', function() {
                    if (card?._id) {
                        logUserAction(card._id, {
                            type: 'featured_link_click',
                            label: `Featured Link Clicked (Modal): "${link.label}"`,
                            url: link.url
                        });
                    }
                });
                
                allFeaturedDiv.appendChild(linkElement);
            });
        }

        // Gallery
        const galleryDiv = document.getElementById('profileGallery');
        galleryDiv.innerHTML = '';
        if (profile?.gallery) {
            profile.gallery.forEach((item, idx) => {
                if (item.type === 'video') {
                    const videoContainer = document.createElement('div');
                    videoContainer.style.position = 'relative';
                    
                    const videoLink = document.createElement('a');
                    videoLink.href = item.url;
                    videoLink.target = '_blank';
                    videoLink.innerHTML = `
                        <img src="${item.thumbnail || ''}" alt="${item.title || ''}" />
                        <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: white; background: rgba(0,0,0,0.5); border-radius: 50%; padding: 0.3em 0.45em;">
                            <i class='fas fa-play'></i>
                        </span>
                    `;
                    
                    // Add click tracking for video links
                    videoLink.addEventListener('click', function() {
                        if (card?._id) {
                            const videoTitle = item.title || `Video ${idx + 1}`;
                            logUserAction(card._id, {
                                type: 'gallery_video_click',
                                label: `Video Clicked: "${videoTitle}"`,
                                url: item.url
                            });
                        }
                    });
                    
                    videoContainer.appendChild(videoLink);
                    
                    const videoTitle = document.createElement('div');
                    videoTitle.style.cssText = 'font-size: 0.9rem; color: #333; text-align: center;';
                    videoTitle.textContent = item.title || '';
                    videoContainer.appendChild(videoTitle);
                    
                    galleryDiv.appendChild(videoContainer);
                } else {
                    const imageContainer = document.createElement('div');
                    
                    const imageElement = document.createElement('img');
                    imageElement.src = item.url;
                    imageElement.alt = item.title || '';
                    imageElement.className = 'gallery-img-popup';
                    imageElement.setAttribute('data-img-idx', idx);
                    imageElement.style.cursor = 'pointer';
                    
                    const imageTitle = document.createElement('div');
                    imageTitle.style.cssText = 'font-size: 0.9rem; color: #333; text-align: center;';
                    imageTitle.textContent = item.title || '';
                    
                    imageContainer.appendChild(imageElement);
                    imageContainer.appendChild(imageTitle);
                    galleryDiv.appendChild(imageContainer);
                }
            });
        }

        // Add popup modal for gallery images (ENHANCED)
        let popupModal = document.getElementById('galleryImageModal');
        if (!popupModal) {
            popupModal = document.createElement('div');
            popupModal.id = 'galleryImageModal';
            popupModal.className = 'modal fade';
            popupModal.tabIndex = -1;
            popupModal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                  <div class="modal-content bg-transparent border-0" style="box-shadow:none;">
                    <div class="modal-body p-0 d-flex flex-column justify-content-center align-items-center position-relative" style="background:rgba(0,0,0,0.85); border-radius:1.2rem; min-width:320px; min-height:320px;">
                      <button type="button" class="btn-close position-absolute top-0 end-0 m-3 z-2" data-bs-dismiss="modal" aria-label="Close" style="filter:invert(1);"></button>
                      <button id="galleryPrevBtn" class="btn position-absolute top-50 start-0 translate-middle-y ms-2 z-2" style="background:rgba(0,0,0,0.4); color:#fff; border-radius:50%; width:2.5rem; height:2.5rem; display:none;"><i class="fas fa-chevron-left"></i></button>
                      <button id="galleryNextBtn" class="btn position-absolute top-50 end-0 translate-middle-y me-2 z-2" style="background:rgba(0,0,0,0.4); color:#fff; border-radius:50%; width:2.5rem; height:2.5rem; display:none;"><i class="fas fa-chevron-right"></i></button>
                      <img id="galleryModalImg" src="" alt="Enlarged" style="max-width:90vw; max-height:70vh; border-radius:1rem; box-shadow:0 2px 16px rgba(0,0,0,0.25); background:#fff; transition:transform 0.25s cubic-bezier(.4,2,.6,1); transform:scale(0.85); opacity:0;" />
                      <div id="galleryModalCaption" class="text-white text-center mt-3 mb-1" style="font-size:1.1rem; font-weight:500;"></div>
                      <div id="galleryModalCount" class="text-white text-center mb-2" style="font-size:0.95rem; opacity:0.7;"></div>
                    </div>
                  </div>
                </div>
            `;
            document.body.appendChild(popupModal);
        }
        // Store gallery images for navigation
        let galleryImages = [];
        let galleryTitles = [];
        if (profile?.gallery) {
            profile.gallery.forEach(item => {
                if (item.type !== 'video') {
                    galleryImages.push(item.url);
                    galleryTitles.push(item.title || '');
                }
            });
        }
        let currentImgIdx = 0;
        function showGalleryModal(idx) {
            const modalImg = document.getElementById('galleryModalImg');
            const caption = document.getElementById('galleryModalCaption');
            const count = document.getElementById('galleryModalCount');
            modalImg.src = galleryImages[idx];
            caption.textContent = galleryTitles[idx] || '';
            count.textContent = `${idx+1} of ${galleryImages.length}`;
            currentImgIdx = idx;
            // Show/hide arrows
            document.getElementById('galleryPrevBtn').style.display = (idx > 0) ? '' : 'none';
            document.getElementById('galleryNextBtn').style.display = (idx < galleryImages.length-1) ? '' : 'none';
            // Animate zoom-in
            setTimeout(() => {
                modalImg.style.transform = 'scale(1)';
                modalImg.style.opacity = '1';
            }, 80);
        }
        // Attach click event to gallery images
        setTimeout(() => {
            document.querySelectorAll('.gallery-img-popup').forEach((img, idx) => {
                img.addEventListener('click', function() {
                    // Log gallery image click with specific image name
                    if (card?._id) {
                        const imageTitle = galleryTitles[idx] || `Image ${idx + 1}`;
                        logUserAction(card._id, {
                            type: 'gallery_image_click',
                            label: `Gallery Image Clicked: "${imageTitle}"`,
                            url: galleryImages[idx]
                        });
                    }
                    
                    const modalImg = document.getElementById('galleryModalImg');
                    modalImg.style.transform = 'scale(0.85)';
                    modalImg.style.opacity = '0';
                    showGalleryModal(idx);
                    const modal = new bootstrap.Modal(document.getElementById('galleryImageModal'));
                    modal.show();
                });
            });
            // Navigation arrows
            document.getElementById('galleryPrevBtn').onclick = function(e) {
                e.stopPropagation();
                if (currentImgIdx > 0) {
                    const modalImg = document.getElementById('galleryModalImg');
                    modalImg.style.transform = 'scale(0.85)';
                    modalImg.style.opacity = '0';
                    setTimeout(() => showGalleryModal(currentImgIdx-1), 120);
                }
            };
            document.getElementById('galleryNextBtn').onclick = function(e) {
                e.stopPropagation();
                if (currentImgIdx < galleryImages.length-1) {
                    const modalImg = document.getElementById('galleryModalImg');
                    modalImg.style.transform = 'scale(0.85)';
                    modalImg.style.opacity = '0';
                    setTimeout(() => showGalleryModal(currentImgIdx+1), 120);
                }
            };
            // Keyboard navigation
            document.getElementById('galleryImageModal').addEventListener('shown.bs.modal', function() {
                document.addEventListener('keydown', galleryKeyHandler);
            });
            document.getElementById('galleryImageModal').addEventListener('hidden.bs.modal', function() {
                document.removeEventListener('keydown', galleryKeyHandler);
            });
            function galleryKeyHandler(e) {
                if (e.key === 'ArrowLeft' && currentImgIdx > 0) {
                    document.getElementById('galleryPrevBtn').click();
                } else if (e.key === 'ArrowRight' && currentImgIdx < galleryImages.length-1) {
                    document.getElementById('galleryNextBtn').click();
                } else if (e.key === 'Escape') {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('galleryImageModal'));
                    if (modal) modal.hide();
                }
            }
        }, 100);

        // Recent activity
        const activityDiv = document.getElementById('profileRecentActivity');
        activityDiv.innerHTML = '';
        if (profile?.recentActivity) {
            profile.recentActivity.forEach(item => {
                activityDiv.innerHTML += `<div class="recent-activity-item"><i class="${item.icon} recent-activity-icon"></i><span>${item.text}</span></div>`;
            });
        }
    } catch (err) {
        console.error('Error in populateCard:', err);
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
        const apiData = await fetchCardData(cardUid);
        console.log(apiData);
        
        // Log the initial tap event
        if (apiData.card?._id) {
            const eventId = getQueryParam('eventId'); // Optional event tracking
            await logTap(apiData.card._id, eventId);
        }
        
        populateCard(apiData);
    } catch (err) {
        document.body.innerHTML = '<div style="color:#333;text-align:center;margin-top:3rem;font-size:1.5rem;">Card not found or error loading card data.</div>';
    }
})();
