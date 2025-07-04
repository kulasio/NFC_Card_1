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
    document.getElementById('profileSection').style.display = '';
    document.getElementById('profileName').textContent = profile?.fullName || user.username || '';
    document.getElementById('profileTitle').textContent = profile?.jobTitle || '';
    document.getElementById('profileEmail').innerHTML = profile?.contact?.email ? `<i class='fas fa-envelope mr-2'></i>${profile.contact.email}` : '';
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
            profileImg.removeAttribute('src');
        }
    } else {
        profileImg.removeAttribute('src');
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
            a.className = 'text-white hover:text-gray-200';
            a.innerHTML = `<i class='${icon} text-xl'></i>`;
            socialLinksDiv.appendChild(a);
        }
    });
}
function renderActions(profile, user) {
    const actionsDiv = document.getElementById('actionButtons');
    actionsDiv.style.display = '';
    actionsDiv.innerHTML = '';
    // Website
    if (profile?.website) {
        actionsDiv.innerHTML += `<a href="${profile.website}" target="_blank" class="block w-full bg-white text-primary py-4 px-6 rounded-xl font-semibold text-center hover:bg-gray-100 transition duration-300"><i class='fas fa-globe mr-2'></i>Visit Website</a>`;
    }
    // Save Contact (vCard)
    if (profile?.contact?.email || user.email) {
        actionsDiv.innerHTML += `<button id="saveContactBtn" class="block w-full bg-white/10 backdrop-blur-lg text-white py-4 px-6 rounded-xl font-semibold text-center hover:bg-white/20 transition duration-300"><i class='fas fa-address-card mr-2'></i>Save Contact</button>`;
    }
    // Send Email
    if (profile?.contact?.email || user.email) {
        const email = profile?.contact?.email || user.email;
        actionsDiv.innerHTML += `<a href="mailto:${email}" class="block w-full bg-white/10 backdrop-blur-lg text-white py-4 px-6 rounded-xl font-semibold text-center hover:bg-white/20 transition duration-300"><i class='fas fa-envelope mr-2'></i>Send Email</a>`;
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
    } catch (err) {
        document.body.innerHTML = '<div style="color:white;text-align:center;margin-top:3rem;font-size:1.5rem;">Card not found or error loading card data.</div>';
    }
}
main();
