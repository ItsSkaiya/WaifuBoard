export async function loadFavorites(favoritesGallery, currentLayout, applyLayoutCallback, createImageCardCallback) {
  
  applyLayoutCallback(favoritesGallery, currentLayout);
  favoritesGallery.innerHTML =
    '<div class="text-center p-10"><p class="text-gray-400">Loading favorites...</p></div>';
  
  const currentFavorites = await window.api.getFavorites();

  if (currentFavorites.length === 0) {
    applyLayoutCallback(favoritesGallery, currentLayout);
    favoritesGallery.innerHTML =
      '<p class="text-gray-400 text-center text-lg">You haven\'t saved any favorites yet.</p>';
    return;
  }

  applyLayoutCallback(favoritesGallery, currentLayout);
  favoritesGallery.innerHTML = '';
  
  const fragment = document.createDocumentFragment();
  
  currentFavorites.forEach((fav) => {
    const card = createImageCardCallback(
      fav.id,
      fav.tags ? fav.tags.split(',') : [],
      fav.image_url,
      fav.thumbnail_url,
      'fav'
    );
    fragment.appendChild(card);
  });
  
  favoritesGallery.appendChild(fragment);
}