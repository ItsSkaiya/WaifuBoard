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
  const favoriteIds = new Set(); 

  try {
      if (window.api && window.api.getFavorites) {
          const favs = await window.api.getFavorites();
          favs.forEach(f => favoriteIds.add(String(f.id)));
      }
  } catch (e) { console.error(e); }

  function showMessage(msg, type = 'success') { if (domRefs.messageBar) uiShowMessage(domRefs.messageBar, msg, type); }
  function showTagModal(tags) { if (domRefs.tagInfoContent) { populateTagModal(domRefs.tagInfoContent, tags); domRefs.tagInfoModal.classList.remove('hidden'); } }
  function localCreateImageCard(id, tags, img, thumb, type) {
    return createImageCard(id, tags, img, thumb, type, { currentLayout, showMessage, showTagModal, applyLayoutToGallery, favoritesGallery: document.getElementById('favorites-gallery'), favoriteIds });
  }
  function updateHeader() { if (domRefs.headerContext) domRefs.headerContext.classList.add('hidden'); }

  const callbacks = { showMessage, applyLayoutToGallery, updateHeader, createImageCard: localCreateImageCard };

  let currentChapters = [];
  let currentChapterPage = 1;
  const CHAPTERS_PER_PAGE = 10; 

  function renderChapterPage() {
      const listContainer = document.getElementById('chapter-list-container');
      if (!listContainer) return;
      listContainer.innerHTML = '';

      const start = (currentChapterPage - 1) * CHAPTERS_PER_PAGE;
      const end = start + CHAPTERS_PER_PAGE;
      const slice = currentChapters.slice(start, end);

      if (slice.length === 0) {
          listContainer.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-tertiary)">No chapters available.</div>';
          return;
      }

      slice.forEach(chapter => {
          const row = document.createElement('div');
          row.className = 'chapter-row';
          
          let mainText = chapter.chapter && chapter.chapter !== '0' ? `Chapter ${chapter.chapter}` : 'Read';
          if(chapter.title && !chapter.title.includes(chapter.chapter)) {
              mainText = chapter.title;
          }

          row.innerHTML = `<span class="chapter-main-text">${mainText}</span>`;
          row.onclick = () => openReader(chapter.id);
          listContainer.appendChild(row);
      });

      const controls = document.getElementById('pagination-controls');
      if (controls) {
          controls.innerHTML = '';
          if (currentChapters.length > CHAPTERS_PER_PAGE) {
              const prev = document.createElement('button');
              prev.className = 'page-btn';
              prev.textContent = '← Prev';
              prev.disabled = currentChapterPage === 1;
              prev.onclick = () => { currentChapterPage--; renderChapterPage(); };

              const next = document.createElement('button');
              next.className = 'page-btn';
              next.textContent = 'Next →';
              next.disabled = end >= currentChapters.length;
              next.onclick = () => { currentChapterPage++; renderChapterPage(); };

              const label = document.createElement('span');
              label.style.color = 'var(--text-secondary)';
              label.style.fontSize = '0.9rem';
              label.textContent = `Page ${currentChapterPage} of ${Math.ceil(currentChapters.length / CHAPTERS_PER_PAGE)}`;

              controls.appendChild(prev);
              controls.appendChild(label);
              controls.appendChild(next);
          }
      }
  }

  async function openBookDetails(id, imageUrl, title, tags) {
      const detailsView = document.getElementById('book-details-view');
      const browseView = document.getElementById('browse-page');
      if (!detailsView || !browseView) return;

      browseView.classList.add('hidden');
      detailsView.classList.remove('hidden');
      
      detailsView.innerHTML = `
        <div class="book-top-nav">
            <div class="back-btn-large" id="back-to-library">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Library
            </div>
        </div>

        <div class="book-layout-grid">
             <div class="book-left-col">
                <img src="${imageUrl}" class="book-poster-large" id="book-details-poster" />
                <h1 class="book-title-sidebar">${title}</h1>
             </div>

             <div class="book-chapters-column">
                <div class="chapter-table-container" id="chapter-list-container">
                    <div class="loading-state" style="padding:2rem;"><p>Loading chapters...</p></div>
                </div>
                <div id="pagination-controls" class="pagination-bar"></div>
             </div>
        </div>
      `;

      document.getElementById('back-to-library').onclick = () => {
          detailsView.classList.add('hidden');
          browseView.classList.remove('hidden');
      };

      let highResCover = null;
      try {
          const aniRes = await window.api.getMetadata(title);
          if (aniRes.success && aniRes.data && aniRes.data.coverImage.extraLarge) {
              highResCover = aniRes.data.coverImage.extraLarge;
          }
      } catch (e) {}

      try {
          const response = await window.api.getChapters(currentSource, id);
          currentChapters = response.success ? response.data : [];
          currentChapterPage = 1;
          
          if (!highResCover && response.extra && response.extra.cover) {
              highResCover = response.extra.cover;
          }

          if (highResCover) {
              const posterEl = document.getElementById('book-details-poster');
              if (posterEl) posterEl.src = highResCover;
          }

          renderChapterPage();
      } catch (err) {
          const chContainer = document.getElementById('chapter-list-container');
          if(chContainer) chContainer.innerHTML = '<div style="padding:1.5rem; text-align:center; color:#ef4444">Failed to load chapters.</div>';
      }
  }

  async function openReader(chapterId) {
      const detailsView = document.getElementById('book-details-view');
      const readerView = document.getElementById('reader-view');
      const readerContent = document.getElementById('reader-content');
      if (!detailsView || !readerView) return;

      detailsView.classList.add('hidden');
      readerView.classList.remove('hidden');
      readerContent.innerHTML = '<div class="loading-state"><p style="color:white;">Loading content...</p></div>';

      const existingBackBtn = readerView.querySelector('.reader-close-btn');
      if(existingBackBtn) existingBackBtn.remove();

      const backBtn = document.createElement('div');
      backBtn.className = 'reader-close-btn';
      backBtn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg> Close Reader';
      backBtn.onclick = () => {
          readerView.classList.add('hidden');
          detailsView.classList.remove('hidden');
          readerContent.innerHTML = ''; 
      };
      readerView.appendChild(backBtn);

      try {
          const response = await window.api.getPages(currentSource, chapterId);
          readerContent.innerHTML = ''; 

          if (!response.success || response.data.length === 0) {
              readerContent.innerHTML = '<p style="color:white;">No content found.</p>';
              return;
          }

          const isTextMode = response.data[0].type === 'text';

          if (isTextMode) {
              const pageData = response.data[0];
              const textDiv = document.createElement('div');
              textDiv.className = 'reader-text-content';
              textDiv.innerHTML = pageData.content;
              readerContent.appendChild(textDiv);
          } else {
              response.data.forEach(page => {
                  const img = document.createElement('img');
                  img.className = 'reader-page-img';
                  img.src = page.url;
                  img.loading = "lazy"; 
                  readerContent.appendChild(img);
              });
          }

      } catch (err) {
          console.error(err);
          showMessage('Failed to load content', 'error');
      }
  }

  if (domRefs.searchModal) setupGlobalKeybinds(domRefs.searchModal);
  if (domRefs.tagInfoCloseButton) domRefs.tagInfoCloseButton.onclick = () => domRefs.tagInfoModal.classList.add('hidden');
  if (domRefs.searchIconButton) {
      domRefs.searchIconButton.onclick = () => { domRefs.searchModal.classList.remove('hidden'); domRefs.searchInput?.focus(); };
      domRefs.searchCloseButton.onclick = () => domRefs.searchModal.classList.add('hidden');
  }

  if (domRefs.sourceList) {
      if (domRefs.contentGallery) applyLayoutToGallery(domRefs.contentGallery, currentLayout);

      const isBooksPage = window.location.pathname.includes('books.html');
      const contentType = isBooksPage ? 'book-board' : 'image-board';

      let initialSource = await populateSources(domRefs.sourceList, contentType);
      currentSource = initialSource;
      updateHeader();

      domRefs.sourceList.addEventListener('click', (e) => {
        const button = e.target.closest('.source-button');
        if (button) {
          domRefs.sourceList.querySelectorAll('.source-button').forEach(b => b.classList.remove('active'));
          button.classList.add('active');
          currentSource = button.dataset.source;
          updateHeader();
          currentPage = 1;
          if (domRefs.searchInput?.value.trim()) performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks);
          else if (domRefs.searchInput) performSearch(currentSource, { value: "" }, currentLayout, domRefs, callbacks);
        }
      });

      if (domRefs.contentGallery) {
          domRefs.contentGallery.addEventListener('click', (e) => {
              const card = e.target.closest('.image-entry');
              if (card && isBooksPage) {
                  if (e.target.closest('button')) return;
                  e.preventDefault(); e.stopPropagation();
                  
                  const bookId = card.dataset.id; 
                  const img = card.querySelector('img');
                  const title = card.dataset.title || "Unknown";
                  
                  if (bookId) openBookDetails(bookId, img ? img.src : '', title, []);
              }
          });
      }

      const scrollContainer = document.querySelector('.content-view');
      if (scrollContainer) {
          scrollContainer.addEventListener('scroll', async () => {
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 600) {
              if (isFetching) return;
              isFetching = true;
              currentPage++;
              if (domRefs.infiniteLoadingSpinner) domRefs.infiniteLoadingSpinner.classList.remove('hidden');
              try { await loadMoreResults(currentSource, currentPage, currentLayout, domRefs, callbacks); } 
              catch (error) { currentPage--; } 
              finally { isFetching = false; if (domRefs.infiniteLoadingSpinner) domRefs.infiniteLoadingSpinner.classList.add('hidden'); }
            }
          });
      }

      if (domRefs.searchButton) {
          domRefs.searchButton.onclick = () => { currentPage = 1; performSearch(currentSource, domRefs.searchInput, currentLayout, domRefs, callbacks); };
      }
  }

  if (document.getElementById('favorites-gallery')) {
      const favGallery = document.getElementById('favorites-gallery');
      const rawFavorites = await window.api.getFavorites();
      favGallery.innerHTML = '';
      if (!rawFavorites || rawFavorites.length === 0) favGallery.innerHTML = '<div class="loading-state"><p>No favorites found.</p></div>';
      else {
          rawFavorites.forEach(row => {
              let tags = [];
              if (typeof row.tags === 'string') tags = row.tags.split(',').filter(t=>t);
              else if (Array.isArray(row.tags)) tags = row.tags;
              const card = localCreateImageCard(row.id, tags, row.image_url, row.thumbnail_url, 'image');
              card.dataset.title = row.title; 
              favGallery.appendChild(card);
          });
      }
      applyLayoutToGallery(favGallery, currentLayout);
  }
});