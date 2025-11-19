import { loadFavorites } from '../favorites/favorites-loader.js';

export function showPage(pageId, domRefs, callbacks, state) {
  const {
    browseButton,
    favoritesButton,
    settingsButton,
    pageTitle,
    headerContext,
    favoritesGallery
  } = domRefs;

  const { updateHeader, applyLayoutToGallery, createImageCard } = callbacks;
  const { currentLayout } = state;

  document.querySelectorAll('.page').forEach((page) => {
    page.classList.add('hidden');
  });

  document.querySelectorAll('.nav-button').forEach((tab) => {
    tab.classList.remove('bg-indigo-600', 'text-white');
    tab.classList.add('text-gray-400', 'hover:bg-gray-700');
  });

  const activePage = document.getElementById(pageId);
  if (activePage) {
    activePage.classList.remove('hidden');
  }

  let activeTab;
  if (pageId === 'browse-page') {
    activeTab = browseButton;
    pageTitle.textContent = 'Browse';
    updateHeader();
  } else if (pageId === 'favorites-page') {
    activeTab = favoritesButton;
    pageTitle.textContent = 'Favorites';
    headerContext.textContent = '';
    
    loadFavorites(favoritesGallery, currentLayout, applyLayoutToGallery, createImageCard);
    
  } else if (pageId === 'settings-page') {
    activeTab = settingsButton;
    pageTitle.textContent = 'Settings';
    headerContext.textContent = '';
  }

  if (activeTab) {
    activeTab.classList.add('bg-indigo-600', 'text-white');
    activeTab.classList.remove('text-gray-400', 'hover:bg-gray-700');
  }
}