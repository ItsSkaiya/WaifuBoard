export async function handleAddFavorite(id, tags, imageUrl, thumbnailUrl, showMessageCallback) {
  const safeTags = Array.isArray(tags) ? tags : [];
  const title = safeTags.length > 0 ? safeTags[0] : 'Favorite';
  const allTags = safeTags.join(',');

  const result = await window.api.addFavorite({
    id,
    title,
    imageUrl,
    thumbnailUrl,
    tags: allTags,
  });

  if (result.success) {
    showMessageCallback('Added to favorites!', 'success');
  } else {
    showMessageCallback(result.error, 'error');
  }
}

export async function handleRemoveFavorite(id, favoritesGallery, showMessageCallback, applyLayoutCallback, currentLayout) {
  const result = await window.api.removeFavorite(id);

  if (result.success) {
    showMessageCallback('Removed from favorites.', 'success');
    
    const cardToRemove = document.querySelector(`#favorites-gallery [data-id='${id}']`);
    
    if (cardToRemove) {
      cardToRemove.classList.add('opacity-0', 'scale-90');
      
      setTimeout(() => {
        cardToRemove.remove();
        if (favoritesGallery.children.length === 0) {
          applyLayoutCallback(favoritesGallery, currentLayout);
          favoritesGallery.innerHTML =
            '<p class="text-gray-400 text-center text-lg">You haven\'t saved any favorites yet.</p>';
        }
      }, 300);
    }
  } else {
    showMessageCallback(result.error, 'error');
  }
}

export function createAddFavoriteButton(id, safeTags, imageUrl, thumbnailUrl, showMessageCallback) {
  const button = document.createElement('button');
  button.title = 'Add to Favorites';
  button.className =
    'p-2 rounded-full bg-black/50 text-white hover:bg-indigo-600 backdrop-blur-sm transition-colors';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.518a.562.562 0 01.31.95l-4.203 3.03a.563.563 0 00-.182.53l1.501 4.87a.562.562 0 01-.82.624l-4.204-3.03a.563.563 0 00-.576 0l-4.204 3.03a.562.562 0 01-.82-.624l1.501-4.87a.563.563 0 00-.182-.53L2.498 9.87a.562.562 0 01.31-.95h5.518a.563.563 0 00.475-.31L11.48 3.5z" />
      </svg>`;
  
  button.onclick = (e) => {
    e.stopPropagation();
    handleAddFavorite(id, safeTags, imageUrl, thumbnailUrl, showMessageCallback);
  };
  return button;
}

export function createRemoveFavoriteButton(id, favoritesGallery, showMessageCallback, applyLayoutCallback, currentLayout) {
  const button = document.createElement('button');
  button.title = 'Remove from Favorites';
  button.className =
    'p-2 rounded-full bg-black/50 text-white hover:bg-red-600 backdrop-blur-sm transition-colors';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.578 0a48.108 48.108 0 01-3.478-.397m15.408 0l-2.147-2.147A1.125 1.125 0 0016.34 3H7.66a1.125 1.125 0 00-.795.325L4.772 5.79m14.456 0l-2.29-2.29a1.125 1.125 0 00-.795-.324H8.455a1.125 1.125 0 00-.795.324L5.37 5.79m13.84 0L20.25 7.5" />
      </svg>`;
  
  button.onclick = (e) => {
    e.stopPropagation();
    handleRemoveFavorite(id, favoritesGallery, showMessageCallback, applyLayoutCallback, currentLayout);
  };
  return button;
}