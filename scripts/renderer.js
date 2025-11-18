document.addEventListener('DOMContentLoaded', () => {
  const browseButton = document.getElementById('browse-button');
  const favoritesButton = document.getElementById('favorites-button');
  const settingsButton = document.getElementById('settings-button');
  const browsePage = document.getElementById('browse-page');
  const pageTitle = document.getElementById('page-title');
  const headerContext = document.getElementById('header-context');

  const searchIconButton = document.getElementById('search-icon-button');
  const searchModal = document.getElementById('search-modal');
  const searchCloseButton = document.getElementById('search-close-button');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');

  const sourceList = document.getElementById('source-list');
  const contentGallery = document.getElementById('content-gallery');
  const favoritesGallery = document.getElementById('favorites-gallery');
  const loadingSpinner = document.getElementById('loading-spinner');
  
  const infiniteLoadingSpinner = document.getElementById(
    'infinite-loading-spinner'
  );
  const messageBar = document.getElementById('message-bar');
  const galleryPlaceholder = document.getElementById('gallery-placeholder');

  const layoutRadios = document.querySelectorAll('input[name="layout"]');

  const tagInfoModal = document.getElementById('tag-info-modal');
  const tagInfoCloseButton = document.getElementById(
    'tag-info-close-button'
  );
  const tagInfoContent = document.getElementById('tag-info-content');

  let currentFavorites = []; 
  let currentSource = '';
  let currentQuery = '';
  let currentLayout = 'scroll'; 
  let currentPage = 1;
  let isLoading = false;
  let hasNextPage = true;

  async function populateSources() {
    console.log('Requesting sources from main process...');
    const sources = await window.api.getSources(); 
    sourceList.innerHTML = '';  

    if (sources && sources.length > 0) {
      sources.forEach((source) => {
        const button = document.createElement('button');
        button.className =
          'source-button w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-200';
        button.dataset.source = source.name;
        button.title = source.name;

        const favicon = document.createElement('img');
        favicon.className = 'w-8 h-8 rounded';

        let mainDomain = source.url; 
        try {
          const hostname = new URL(source.url).hostname;
          const parts = hostname.split('.');
          if (parts.length > 2 && ['api', 'www'].includes(parts[0])) {
            mainDomain = parts.slice(1).join('.');
          } else {
            mainDomain = hostname;
          }
        } catch (e) {
          console.warn(`Could not parse domain from ${source.url}:`, e);
          mainDomain = source.name;
        }
        
        favicon.src = `https://www.google.com/s2/favicons?domain=${mainDomain}&sz=32`;
        favicon.alt = source.name;
        favicon.onerror = () => {
          button.innerHTML = `<span class="font-bold text-sm">${source.name.substring(
            0,
            2
          )}</span>`;
          favicon.remove();
        };

        button.appendChild(favicon);
        sourceList.appendChild(button);
      });
      console.log('Sources populated:', sources);

      if (sourceList.children.length > 0) {
        const firstButton = sourceList.children[0];
        firstButton.classList.add('active');
        currentSource = firstButton.dataset.source;
        updateHeader();
      }
    } else {
      console.warn('No sources were loaded from the main process.');
    }
  }

  sourceList.addEventListener('click', (e) => {
    const button = e.target.closest('.source-button');
    if (button) {
      sourceList
        .querySelectorAll('.source-button')
        .forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      
      currentSource = button.dataset.source;
      console.log('Source changed to:', currentSource);
      updateHeader();
      if (currentQuery) {
        performSearch();
      }
    }
  });

  function showPage(pageId) {

    document.querySelectorAll('.page').forEach((page) => {
      page.classList.add('hidden');
    });

    document.querySelectorAll('.nav-button').forEach((tab) => {
      tab.classList.remove('bg-indigo-600', 'text-white');
      tab.classList.add('text-gray-400', 'hover:bg-gray-700');
    });

    const activePage = document.getElementById(pageId);
    activePage.classList.remove('hidden');

    let activeTab;
    if (pageId === 'browse-page') {
      activeTab = browseButton;
      pageTitle.textContent = 'Browse';
      updateHeader(); 
    } else if (pageId === 'favorites-page') {
      activeTab = favoritesButton;
      pageTitle.textContent = 'Favorites';
      headerContext.textContent = ''; 

      loadFavorites();
    } else if (pageId === 'settings-page') {
      activeTab = settingsButton;
      pageTitle.textContent = 'Settings';
      headerContext.textContent = ''; 
    }
    activeTab.classList.add('bg-indigo-600', 'text-white');
    activeTab.classList.remove('text-gray-400', 'hover:bg-gray-700');
  }

  browseButton.addEventListener('click', () => showPage('browse-page'));
  favoritesButton.addEventListener('click', () => showPage('favorites-page'));
  settingsButton.addEventListener('click', () => showPage('settings-page'));

  searchIconButton.addEventListener('click', () => {
    searchModal.classList.remove('hidden');
    searchInput.focus(); 
    searchInput.select();
  });
  searchCloseButton.addEventListener('click', () => {
    searchModal.classList.add('hidden');
  });
  searchButton.addEventListener('click', () => {
    performSearch();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchModal.classList.add('hidden');
    }
  });

  tagInfoCloseButton.addEventListener('click', () => {
    tagInfoModal.classList.add('hidden');
  });
  
  tagInfoModal.addEventListener('click', (e) => {
    if (e.target === tagInfoModal) {
      tagInfoModal.classList.add('hidden');
    }
  });

  function showTagModal(tags) {
    tagInfoContent.innerHTML = ''; 

    if (!tags || tags.length === 0) {
      tagInfoContent.innerHTML =
        '<p class="text-gray-400">No tags available for this image.</p>';
      tagInfoModal.classList.remove('hidden');
      return;
    }

    const fragment = document.createDocumentFragment();
    tags.forEach((tag) => {
      if (tag) {
        const tagPill = document.createElement('span');
        tagPill.className =
          'px-2.5 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-full';
        tagPill.textContent = tag.replace(/_/g, ' '); 
        fragment.appendChild(tagPill);
      }
    });
    tagInfoContent.appendChild(fragment);
    tagInfoModal.classList.remove('hidden');
  }

  function updateHeader() {
    if (currentSource) {
      headerContext.textContent = `Source: ${currentSource}`;
    } else {
      headerContext.textContent = 'No source selected';
    }
  }

  async function performSearch() {
    if (!currentSource) {
      showMessage('Please select a source from the sidebar.', 'error');
      return;
    }

    currentPage = 1;
    hasNextPage = true;
    isLoading = false;
    currentQuery = searchInput.value.trim().replace(/[, ]+/g, ' ');

    if (galleryPlaceholder) galleryPlaceholder.classList.add('hidden');

    applyLayoutToGallery(contentGallery, currentLayout);
    contentGallery.innerHTML = ''; 
    updateHeader(); 

    searchModal.classList.add('hidden');

    loadMoreResults();
  }

  async function loadMoreResults() {

    if (isLoading || !hasNextPage) {
      return;
    }

    isLoading = true;

    if (currentPage === 1) {
      loadingSpinner.classList.remove('hidden'); 
    } else {
      infiniteLoadingSpinner.classList.remove('hidden'); 
    }

    const result = await window.api.search(
      currentSource,
      currentQuery,
      currentPage
    );

    loadingSpinner.classList.add('hidden');
    infiniteLoadingSpinner.classList.add('hidden');

    if (
      !result.success ||
      !result.data.results ||
      result.data.results.length === 0
    ) {
      hasNextPage = false; 
      if (currentPage === 1) {

        applyLayoutToGallery(contentGallery, currentLayout);
        contentGallery.innerHTML =
          '<p class="text-gray-400 text-center text-lg">No results found. Please try another search term.</p>';
      }

      isLoading = false;
      return;
    }

    const validResults = result.data.results.filter((item) => item.image);

    if (validResults.length === 0) {
      hasNextPage = false; 
      if (currentPage === 1) {
        applyLayoutToGallery(contentGallery, currentLayout);
        contentGallery.innerHTML =
          '<p class="text-gray-400 text-center text-lg">Found results, but none had valid images.</p>';
      }
      isLoading = false;
      return;
    }

    const fragment = document.createDocumentFragment();
    validResults.forEach((item) => {
      const thumbnailUrl = item.image;

      const displayUrl = item.sampleImageUrl || item.fullImageUrl || thumbnailUrl;

      const card = createImageCard(
        item.id.toString(),
        item.tags, 
        displayUrl,   
        thumbnailUrl, 
        'browse'
      );
      fragment.appendChild(card);
    });

    contentGallery.appendChild(fragment);

    hasNextPage = result.data.hasNextPage;
    currentPage++;
    isLoading = false;
  }

  browsePage.addEventListener('scroll', () => {
    if (
      browsePage.scrollTop + browsePage.clientHeight >=
      browsePage.scrollHeight - 600 
    ) {
      loadMoreResults();
    }
  });

  async function loadFavorites() {
    applyLayoutToGallery(favoritesGallery, currentLayout);
    favoritesGallery.innerHTML =
      '<div class="text-center p-10"><p class="text-gray-400">Loading favorites...</p></div>';
    currentFavorites = await window.api.getFavorites();

    if (currentFavorites.length === 0) {
      applyLayoutToGallery(favoritesGallery, currentLayout);
      favoritesGallery.innerHTML =
        '<p class="text-gray-400 text-center text-lg">You haven\'t saved any favorites yet.</p>';
      return;
    }

    applyLayoutToGallery(favoritesGallery, currentLayout);
    favoritesGallery.innerHTML = ''; 
    const fragment = document.createDocumentFragment();
    currentFavorites.forEach((fav) => {
      const card = createImageCard(
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

  async function handleAddFavorite(id, tags, imageUrl, thumbnailUrl) {
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
      showMessage('Added to favorites!', 'success');
    } else {
      showMessage(result.error, 'error');
    }
  }

  async function handleRemoveFavorite(id) {
    const result = await window.api.removeFavorite(id);
    if (result.success) {
      showMessage('Removed from favorites.', 'success');
      const cardToRemove = document.querySelector(
        `#favorites-gallery [data-id='${id}']`
      );
      if (cardToRemove) {
        cardToRemove.classList.add('opacity-0', 'scale-90');
        setTimeout(() => {
          cardToRemove.remove();
          if (favoritesGallery.children.length === 0) {
            applyLayoutToGallery(favoritesGallery, currentLayout);
            favoritesGallery.innerHTML =
              '<p class="text-gray-400 text-center text-lg">You haven\'t saved any favorites yet.</p>';
          }
        }, 300); 
      }
    } else {
      showMessage(result.error, 'error');
    }
  }

  function createImageCard(id, tags, imageUrl, thumbnailUrl, type) {

    const safeTags = Array.isArray(tags) ? tags : [];

    const entry = document.createElement('div');
    entry.dataset.id = id;
    entry.className = `image-entry group relative bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300`;

    if (currentLayout === 'compact') {

      entry.classList.add('aspect-square');
    }

    const imageContainer = document.createElement('div');
    imageContainer.className =
      'w-full bg-gray-700 animate-pulse relative';

    if (currentLayout === 'compact') {
      imageContainer.classList.add('h-full');
    } else {
      imageContainer.classList.add('min-h-[200px]');
    }

    entry.appendChild(imageContainer);

    const img = document.createElement('img');
    img.src = imageUrl; 
    img.alt = safeTags.join(', '); 
    img.className = 'w-full h-auto object-contain bg-gray-900 opacity-0'; 
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';

    if (currentLayout === 'compact') {
        img.className = 'w-full h-full object-cover bg-gray-900 opacity-0';
    }

    img.onload = () => {
      imageContainer.classList.remove('animate-pulse', 'bg-gray-700');
      img.classList.remove('opacity-0');
      img.classList.add('transition-opacity', 'duration-500');
    };

    img.onerror = () => {
      console.warn(`Failed to load full image: ${imageUrl}. Falling back to thumbnail.`);
      img.src = thumbnailUrl; 
      imageContainer.classList.remove('animate-pulse', 'bg-gray-700');
      img.classList.remove('opacity-0');
      img.classList.add('transition-opacity', 'duration-500');
      img.onerror = null; 
    };
    imageContainer.appendChild(img);

    const buttonContainer = document.createElement('div');
    buttonContainer.className =
      'image-buttons absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200';

    buttonContainer.appendChild(createInfoButton(safeTags));

    if (type === 'browse') {
      buttonContainer.appendChild(
        createAddFavoriteButton(id, safeTags, imageUrl, thumbnailUrl)
      );
    } else {
      buttonContainer.appendChild(createRemoveFavoriteButton(id));
    }
    imageContainer.appendChild(buttonContainer); 

    return entry;
  }

  // ------------------------------------------------------------------
  // DELETED: The source-specific getFullImageUrl function is removed.
  // The extensions must now provide the correct URLs in the search result.
  // ------------------------------------------------------------------


  function createInfoButton(safeTags) {
    const button = document.createElement('button');
    button.title = 'Show Info';
    button.className =
      'p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 backdrop-blur-sm transition-colors';
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>`;
    button.onclick = (e) => {
      e.stopPropagation(); 
      showTagModal(safeTags);
    };
    return button;
  }

  function createAddFavoriteButton(id, safeTags, imageUrl, thumbnailUrl) {
    const button = document.createElement('button');
    button.title = 'Add to Favorites';
    button.className =
      'p-2 rounded-full bg-black/50 text-white hover:bg-indigo-600 backdrop-blur-sm transition-colors';
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.31h5.518a.562.562 0 01.31.95l-4.203 3.03a.563.563 0 00-.182.53l1.501 4.87a.562.562 0 01-.82.624l-4.204-3.03a.563.563 0 00-.576 0l-4.204 3.03a.562.562 0 01-.82-.624l1.501-4.87a.563.563 0 00-.182-.53L2.498 9.87a.562.562 0 01.31-.95h5.518a.563.563 0 00.475-.31L11.48 3.5z" />
      </svg>`;
    button.onclick = (e) => {
      e.stopPropagation(); 
      handleAddFavorite(id, safeTags, imageUrl, thumbnailUrl);
    };
    return button;
  }

  function createRemoveFavoriteButton(id) {
    const button = document.createElement('button');
    button.title = 'Remove from Favorites';
    button.className =
      'p-2 rounded-full bg-black/50 text-white hover:bg-red-600 backdrop-blur-sm transition-colors';
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.578 0a48.108 48.108 0 01-3.478-.397m15.408 0l-2.147-2.147A1.125 1.125 0 0016.34 3H7.66a1.125 1.125 0 00-.795.325L4.772 5.79m14.456 0l-2.29-2.29a1.125 1.125 0 00-.795-.324H8.455a1.125 1.125 0 00-.795.324L5.37 5.79m13.84 0L20.25 7.5" />
      </svg>`;
    button.onclick = (e) => {
      e.stopPropagation(); 
      handleRemoveFavorite(id);
    };
    return button;
  }

  function showMessage(message, type = 'success') {
    if (!messageBar) return;
    messageBar.textContent = message;

    if (type === 'error') {
      messageBar.classList.remove('bg-green-600');
      messageBar.classList.add('bg-red-600');
    } else {
      messageBar.classList.remove('bg-red-600');
      messageBar.classList.add('bg-green-600');
    }

    messageBar.classList.remove('hidden', 'translate-y-16');

    setTimeout(() => {
      messageBar.classList.add('hidden', 'translate-y-16');
    }, 3000);
  }

  function loadSettings() {
    const savedLayout = localStorage.getItem('waifuBoardLayout') || 'scroll';
    currentLayout = savedLayout;

    const savedRadio = document.querySelector(
      `input[name="layout"][value="${savedLayout}"]`
    );
    if (savedRadio) {
      savedRadio.checked = true;
    } else {

      document.getElementById('layout-scroll').checked = true;
      currentLayout = 'scroll';
      localStorage.setItem('waifuBoardLayout', 'scroll');
    }
  }

  function handleLayoutChange(e) {
    const newLayout = e.target.value;
    localStorage.setItem('waifuBoardLayout', newLayout);
    currentLayout = newLayout;
    console.log('Layout changed to:', newLayout);

    if (browsePage.classList.contains('hidden')) {
      loadFavorites(); 
    } else {

      if (currentQuery) {
        performSearch(); 
      } else {
        applyLayoutToGallery(contentGallery, currentLayout);
      }
    }
  }

  function applyLayoutToGallery(galleryElement, layout) {
    galleryElement.className = 'p-4 w-full';

    if (layout === 'scroll') {
      galleryElement.classList.add('max-w-3xl', 'mx-auto', 'space-y-8');
    } else if (layout === 'grid') {
      galleryElement.classList.add('gallery-masonry');
    } else if (layout === 'compact') {
      galleryElement.classList.add('gallery-grid');
    }
  }

  layoutRadios.forEach((radio) => {
    radio.addEventListener('change', handleLayoutChange);
  });

  loadSettings(); 
  populateSources();
  showPage('browse-page'); 
});