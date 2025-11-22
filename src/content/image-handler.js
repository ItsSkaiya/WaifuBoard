export function createImageCard(id, tags, imageUrl, thumbnailUrl, type, options = {}) {
    const { 
        showMessage, 
        showTagModal, 
        favoriteIds = new Set() 
    } = options;

    const card = document.createElement('div');
    card.className = 'image-entry';
    card.dataset.id = id; 
    card.dataset.type = type;
    card.title = tags.join(', '); 

    const img = document.createElement('img');
    img.src = thumbnailUrl || imageUrl;
    img.loading = 'lazy';
    img.alt = tags.join(' ');
    img.onload = () => img.classList.add('loaded');
    
    card.appendChild(img);

    if (type === 'book') {
        const readOverlay = document.createElement('div');
        readOverlay.className = 'book-read-overlay';
        readOverlay.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <span>Click To Read</span>
        `;
        card.appendChild(readOverlay);
        
        return card;
    }

    const buttonsOverlay = document.createElement('div');
    buttonsOverlay.className = 'image-buttons';

    const favBtn = document.createElement('button');
    favBtn.className = 'heart-button';
    favBtn.dataset.id = id;
    
    const isFavorited = favoriteIds.has(String(id));
    updateHeartIcon(favBtn, isFavorited);

    favBtn.onclick = async (e) => {
        e.stopPropagation(); 
        e.preventDefault();

        const currentlyFavorited = favoriteIds.has(String(id));

        if (currentlyFavorited) {
            const success = await window.api.removeFavorite(id);
            if (success) {
                favoriteIds.delete(String(id));
                updateHeartIcon(favBtn, false);
                showMessage('Removed from favorites', 'success');
                if (window.location.pathname.includes('favorites.html')) {
                    card.remove();
                    if (options.applyLayoutToGallery && options.favoritesGallery) {
                        options.applyLayoutToGallery(options.favoritesGallery, options.currentLayout);
                    }
                }
            } else {
                showMessage('Failed to remove favorite', 'error');
            }
        } else {
            const favoriteData = {
                id: String(id),
                image_url: imageUrl,
                thumbnail_url: thumbnailUrl,
                tags: tags.join(','),
                title: card.title || 'Unknown'
            };
            const success = await window.api.addFavorite(favoriteData);
            if (success) {
                favoriteIds.add(String(id));
                updateHeartIcon(favBtn, true);
                showMessage('Added to favorites', 'success');
            } else {
                showMessage('Failed to save favorite', 'error');
            }
        }
    };

    const tagBtn = document.createElement('button');
    tagBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
    tagBtn.title = "View Tags";
    tagBtn.onclick = (e) => {
        e.stopPropagation();
        showTagModal(tags);
    };

    buttonsOverlay.appendChild(tagBtn);
    buttonsOverlay.appendChild(favBtn);
    card.appendChild(buttonsOverlay);

    return card;
}

function updateHeartIcon(btn, isFavorited) {
    if (isFavorited) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        btn.title = "Remove from Favorites";
    } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
        btn.title = "Add to Favorites";
    }
}

export function populateTagModal(container, tags) {
    container.innerHTML = '';
    if (!tags || tags.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary)">No tags available.</p>';
        return;
    }
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        container.appendChild(span);
    });
}