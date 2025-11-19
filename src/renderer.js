import { populateSources } from './extensions/load-extensions.js';
import { setupGlobalKeybinds } from './utils/keybinds.js';
import { getDomElements } from './utils/dom-loader.js'; 
import { performSearch, loadMoreResults } from './modules/search-handler.js';
import { createImageCard, populateTagModal } from './content/image-handler.js';
import { showMessage as uiShowMessage } from './modules/ui-utils.js';
import { showPage as navShowPage } from './modules/navigation-handler.js';
import { applyLayoutToGallery, loadSavedLayout, saveLayout } from './modules/layout-manager.js';  

document.addEventListener('DOMContentLoaded', async () => {
  const domRefs = getDomElements();
  
  let currentSource = '';
  let currentLayout = loadSavedLayout(); 
  
  setupGlobalKeybinds(domRefs.searchModal);
  
  function showMessage(message, type = 'success') {
    uiShowMessage(domRefs.messageBar, message, type);
  }

  function showTagModal(tags) {
    populateTagModal(domRefs.tagInfoContent, tags);
    domRefs.tagInfoModal.classList.remove('hidden');
  }

  function localCreateImageCard(id, tags, imageUrl, thumbnailUrl, type) {
    return createImageCard(id, tags, imageUrl, thumbnailUrl, type, {
      currentLayout,
      showMessage,
      showTagModal,
      applyLayoutToGallery,
      favoritesGallery: domRefs.favoritesGallery
    });
  }

  function updateHeader() {
    if (currentSource) {
      domRefs.headerContext.textContent = `Source: ${currentSource}`;
    } else {
      domRefs.headerContext.textContent = 'No source selected';
    }
  }

  const callbacks = {
    showMessage,
    applyLayoutToGallery,
    updateHeader,
    createImageCard: localCreateImageCard
  };

  function handleNavigation(pageId) {
    navShowPage(pageId, domRefs, callbacks, { currentLayout });
  }

  domRefs.sourceList.addEventListener('click', (e) => {
    const button = e.target.closest('.source-button');
    if (button) {
      domRefs.sourceList
        .querySelectorAll('.source-button')
        .forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      currentSource = button.dataset.source;
      console.log('Source changed to:', currentSource);
      updateHeader();
      
      if (domRefs.searchInput.value.trim()) {
        performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks);
      }
    }
  });

  domRefs.browseButton.addEventListener('click', () => handleNavigation('browse-page'));
  domRefs.favoritesButton.addEventListener('click', () => handleNavigation('favorites-page'));
  domRefs.settingsButton.addEventListener('click', () => handleNavigation('settings-page'));

  domRefs.searchIconButton.addEventListener('click', () => {
    domRefs.searchModal.classList.remove('hidden');
    domRefs.searchInput.focus();
    domRefs.searchInput.select();
  });
  domRefs.searchCloseButton.addEventListener('click', () => {
    domRefs.searchModal.classList.add('hidden');
  });
  domRefs.searchButton.addEventListener('click', () => {
    performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks);
  });

  domRefs.tagInfoCloseButton.addEventListener('click', () => {
    domRefs.tagInfoModal.classList.add('hidden');
  });
  domRefs.tagInfoModal.addEventListener('click', (e) => {
    if (e.target === domRefs.tagInfoModal) {
      domRefs.tagInfoModal.classList.add('hidden');
    }
  });
  
  domRefs.browsePage.addEventListener('scroll', () => {
    if (
      domRefs.browsePage.scrollTop + domRefs.browsePage.clientHeight >=
      domRefs.browsePage.scrollHeight - 600
    ) {
      loadMoreResults(currentSource, currentLayout, domRefs, callbacks);
    }
  });

  domRefs.layoutRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const newLayout = e.target.value;
      saveLayout(newLayout);
      currentLayout = newLayout;

      if (domRefs.browsePage.classList.contains('hidden')) {
        handleNavigation('favorites-page');
      } else {
        if (domRefs.searchInput.value.trim()) {
          performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks);
        } else {
          applyLayoutToGallery(domRefs.contentGallery, currentLayout);
        }
      }
    });
  });

  
  const initialSource = await populateSources(domRefs.sourceList);
  currentSource = initialSource;

  updateHeader();
  handleNavigation('browse-page');
});