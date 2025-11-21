import { populateSources } from './extensions/load-extensions.js';
import { setupGlobalKeybinds } from './utils/keybinds.js';
import { getDomElements } from './utils/dom-loader.js';
import { performSearch, loadMoreResults } from './modules/search-handler.js';
import { createImageCard, populateTagModal } from './content/image-handler.js';
import { showMessage as uiShowMessage } from './modules/ui-utils.js';
import { applyLayoutToGallery } from './modules/layout-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
  const domRefs = getDomElements();
  
  const currentLayout = 'grid'; 
  let currentSource = '';
  let currentPage = 1;      
  let isFetching = false;   

  function showMessage(message, type = 'success') {
    if (domRefs.messageBar) {
        uiShowMessage(domRefs.messageBar, message, type);
    }
  }

  function showTagModal(tags) {
    if (domRefs.tagInfoContent && domRefs.tagInfoModal) {
        populateTagModal(domRefs.tagInfoContent, tags);
        domRefs.tagInfoModal.classList.remove('hidden');
    }
  }

  function localCreateImageCard(id, tags, imageUrl, thumbnailUrl, type) {
    return createImageCard(id, tags, imageUrl, thumbnailUrl, type, {
      currentLayout,
      showMessage,
      showTagModal,
      applyLayoutToGallery,
      favoritesGallery: document.getElementById('favorites-gallery') 
    });
  }

  function updateHeader() {
    if (!domRefs.headerContext) return;
    domRefs.headerContext.classList.add('hidden');
  }

  const callbacks = {
    showMessage,
    applyLayoutToGallery,
    updateHeader,
    createImageCard: localCreateImageCard
  };

  if (domRefs.searchModal) {
      setupGlobalKeybinds(domRefs.searchModal);
  }

  if (domRefs.tagInfoCloseButton && domRefs.tagInfoModal) {
      domRefs.tagInfoCloseButton.addEventListener('click', () => {
        domRefs.tagInfoModal.classList.add('hidden');
      });
      domRefs.tagInfoModal.addEventListener('click', (e) => {
        if (e.target === domRefs.tagInfoModal) {
          domRefs.tagInfoModal.classList.add('hidden');
        }
      });
  }

  if (domRefs.searchIconButton && domRefs.searchModal) {
      domRefs.searchIconButton.addEventListener('click', () => {
        domRefs.searchModal.classList.remove('hidden');
        if(domRefs.searchInput) {
            domRefs.searchInput.focus();
            domRefs.searchInput.select();
        }
      });
      
      domRefs.searchCloseButton.addEventListener('click', () => {
        domRefs.searchModal.classList.add('hidden');
      });
  }

  if (domRefs.sourceList) {
      if (domRefs.contentGallery) {
          applyLayoutToGallery(domRefs.contentGallery, currentLayout);
      }

      let initialSource = '';
      if (window.api && window.api.getSources) {
          initialSource = await populateSources(domRefs.sourceList);
      } else {
          initialSource = await populateSources(domRefs.sourceList);
      }
      
      currentSource = initialSource;
      updateHeader();

      domRefs.sourceList.addEventListener('click', (e) => {
        const button = e.target.closest('.source-button');
        if (button) {
          domRefs.sourceList
            .querySelectorAll('.source-button')
            .forEach((btn) => btn.classList.remove('active'));
          button.classList.add('active');

          currentSource = button.dataset.source;
          updateHeader();
          
          currentPage = 1;

          if (domRefs.searchInput && domRefs.searchInput.value.trim()) {
            performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks);
          } else if (domRefs.searchInput) {
             performSearch(currentSource, { value: "" }, currentLayout, domRefs, callbacks);
          }
        }
      });

      const scrollContainer = document.querySelector('.content-view');
      if (scrollContainer) {
          scrollContainer.addEventListener('scroll', async () => {
            if (
              scrollContainer.scrollTop + scrollContainer.clientHeight >=
              scrollContainer.scrollHeight - 600
            ) {
              if (isFetching) return;
              isFetching = true;

              currentPage++;
              
              if (domRefs.infiniteLoadingSpinner) {
                  domRefs.infiniteLoadingSpinner.classList.remove('hidden');
              }

              try {
                  await loadMoreResults(currentSource, currentPage, currentLayout, domRefs, callbacks);
              } catch (error) {
                  console.error("Failed to load more results:", error);
                  currentPage--; 
              } finally {
                  isFetching = false;
                  if (domRefs.infiniteLoadingSpinner) {
                      domRefs.infiniteLoadingSpinner.classList.add('hidden');
                  }
              }
            }
          });
      }

      if (domRefs.searchButton && domRefs.searchInput) {
          domRefs.searchButton.addEventListener('click', () => {
            currentPage = 1;
            performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks);
          });
      }
  }

  if (document.getElementById('favorites-gallery')) {
      const favGallery = document.getElementById('favorites-gallery');
      
      const fetchFavorites = async () => {
        try {
            if (window.api && window.api.getFavorites) {
                return await window.api.getFavorites();
            } else {
                console.error("window.api.getFavorites is missing.");
                return [];
            }
        } catch (err) {
            console.error("Error fetching favorites via IPC:", err);
            return [];
        }
      };

      const rawFavorites = await fetchFavorites();
      
      favGallery.innerHTML = '';
      
      if (!rawFavorites || rawFavorites.length === 0) {
          const emptyState = document.createElement('div');
          emptyState.className = 'loading-state';
          emptyState.style.gridColumn = '1 / -1';
          emptyState.innerHTML = '<p>No favorites found.</p>';
          favGallery.appendChild(emptyState);
      } else {
          rawFavorites.forEach(row => {
              const id = row.id;
              const imageUrl = row.image_url;
              const thumbnailUrl = row.thumbnail_url;
              
              let tags = [];
              if (typeof row.tags === 'string') {
                  tags = row.tags.split(',').filter(t => t.trim() !== '');
              } else if (Array.isArray(row.tags)) {
                  tags = row.tags;
              }

              const card = localCreateImageCard(
                  id, 
                  tags, 
                  imageUrl, 
                  thumbnailUrl, 
                  'image'
              );
              favGallery.appendChild(card);
          });
      }
      
      applyLayoutToGallery(favGallery, currentLayout);
  }
});