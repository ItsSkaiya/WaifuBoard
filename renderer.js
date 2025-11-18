/*
  renderer.js
  MODIFIED: Now includes infinite scrolling
*/
document.addEventListener('DOMContentLoaded', () => {
  // --- Page Elements ---
  const browseButton = document.getElementById('browse-button');
  const favoritesButton = document.getElementById('favorites-button');
  const settingsButton = document.getElementById('settings-button');
  const browsePage = document.getElementById('browse-page');
  const favoritesPage = document.getElementById('favorites-page');
  const settingsPage = document.getElementById('settings-page');
  const pageTitle = document.getElementById('page-title');
  const headerContext = document.getElementById('header-context');

  // --- Search Modal Elements ---
  const searchIconButton = document.getElementById('search-icon-button');
  const searchModal = document.getElementById('search-modal');
  const searchCloseButton = document.getElementById('search-close-button');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');

  // --- Gallery Elements ---
  const sourceList = document.getElementById('source-list');
  const contentGallery = document.getElementById('content-gallery');
  const favoritesGallery = document.getElementById('favorites-gallery');
  const loadingSpinner = document.getElementById('loading-spinner');
  // NEW: Get the infinite loading spinner
  const infiniteLoadingSpinner = document.getElementById(
    'infinite-loading-spinner'
  );
  const messageBar = document.getElementById('message-bar');
  const galleryPlaceholder = document.getElementById('gallery-placeholder');

  // --- Settings Elements ---
  const layoutRadios = document.querySelectorAll('input[name="layout"]');
  const layoutScroll = document.getElementById('layout-scroll');
  const layoutGrid = document.getElementById('layout-grid');
  const layoutCompact = document.getElementById('layout-compact');

  // --- Tag Info Modal Elements ---
  const tagInfoModal = document.getElementById('tag-info-modal');
  const tagInfoCloseButton = document.getElementById(
    'tag-info-close-button'
  );
  const tagInfoContent = document.getElementById('tag-info-content');

  // --- App State ---
  let currentFavorites = []; // Cache for favorites
  let currentSource = '';
  let currentQuery = '';
  let currentLayout = 'scroll'; // Default layout
  // --- NEW: State for infinite scroll ---
  let currentPage = 1;
  let isLoading = false;
  let hasNextPage = true;

  // --- Populate Sources Sidebar ---
  async function populateSources() {
    console.log('Requesting sources from main process...');
    const sources = await window.api.getSources(); // e.g., [{ name: 'Gelbooru', url: '...' }]
    sourceList.innerHTML = ''; // Clear "Loading..."

    if (sources && sources.length > 0) {
      sources.forEach((source) => {
        const button = document.createElement('button');
        button.className =
          'source-button w-12 h-12 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-200';
        button.dataset.source = source.name;
        button.title = source.name;

        // Create and add favicon
        const favicon = document.createElement('img');
        favicon.className = 'w-8 h-8 rounded';

        // Parse main domain from URL to get correct favicon
        let mainDomain = source.url; // Default to the full URL
        try {
          const hostname = new URL(source.url).hostname; // e.g., 'api.waifu.pics'
          const parts = hostname.split('.');
          if (parts.length > 2 && ['api', 'www'].includes(parts[0])) {
            // Get the last two parts (e.g., 'waifu.pics' from 'api.waifu.pics')
            mainDomain = parts.slice(1).join('.');
          } else {
            // It's already a main domain (e.g., 'gelbooru.com')
            mainDomain = hostname;
          }
        } catch (e) {
          console.warn(`Could not parse domain from ${source.url}:`, e);
          mainDomain = source.name;
        }
        // --- END NEW ---

        // Use Google's favicon service. sz=32 requests a 32x32 icon.
        favicon.src = `https://www.google.com/s2/favicons?domain=${mainDomain}&sz=32`;
        favicon.alt = source.name;
        // Fallback in case favicon fails to load
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

      // Set first source as active by default
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

  // --- Source Selection ---
  sourceList.addEventListener('click', (e) => {
    const button = e.target.closest('.source-button');
    if (button) {
      // ... (remove/add active class) ...
      sourceList
        .querySelectorAll('.source-button')
        .forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      
      currentSource = button.dataset.source;
      console.log('Source changed to:', currentSource);
      updateHeader();
      // Automatically re-search when changing source if a query exists
      if (currentQuery) {
        // This will reset the gallery and start a new search
        performSearch();
      }
    }
  });

  // --- Tab Switching Logic (Sidebar) ---
  function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach((page) => {
      page.classList.add('hidden');
    });
    // De-activate all icon buttons
    document.querySelectorAll('.nav-button').forEach((tab) => {
      tab.classList.remove('bg-indigo-600', 'text-white');
      tab.classList.add('text-gray-400', 'hover:bg-gray-700');
    });

    // Show the active page
    const activePage = document.getElementById(pageId);
    activePage.classList.remove('hidden');

    // Highlight the active icon button
    let activeTab;
    if (pageId === 'browse-page') {
      activeTab = browseButton;
      pageTitle.textContent = 'Browse';
      updateHeader(); // Update header context
    } else if (pageId === 'favorites-page') {
      activeTab = favoritesButton;
      pageTitle.textContent = 'Favorites';
      headerContext.textContent = ''; // Clear context
      // When switching to favorites, refresh the list
      loadFavorites();
    } else if (pageId === 'settings-page') {
      activeTab = settingsButton;
      pageTitle.textContent = 'Settings';
      headerContext.textContent = ''; // Clear context
    }
    activeTab.classList.add('bg-indigo-600', 'text-white');
    activeTab.classList.remove('text-gray-400', 'hover:bg-gray-700');
  }

  browseButton.addEventListener('click', () => showPage('browse-page'));
  favoritesButton.addEventListener('click', () => showPage('favorites-page'));
  settingsButton.addEventListener('click', () => showPage('settings-page'));

  // --- Search Modal Logic ---
  searchIconButton.addEventListener('click', () => {
    searchModal.classList.remove('hidden');
    searchInput.focus(); // Auto-focus the search bar
    searchInput.select();
  });
  searchCloseButton.addEventListener('click', () => {
    searchModal.classList.add('hidden');
  });
  searchButton.addEventListener('click', () => {
    // Sanitize search query to allow multiple tags
    // MODIFIED: This just calls performSearch, which now handles its own state
    performSearch();
  });
  // Close search modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchModal.classList.add('hidden');
    }
  });

  // --- Tag Info Modal Logic ---
  tagInfoCloseButton.addEventListener('click', () => {
    tagInfoModal.classList.add('hidden');
  });
  // Close tag modal by clicking the backdrop
  tagInfoModal.addEventListener('click', (e) => {
    if (e.target === tagInfoModal) {
      tagInfoModal.classList.add('hidden');
    }
  });

  // Function to show the tag info modal
  function showTagModal(tags) {
    tagInfoContent.innerHTML = ''; // Clear old tags

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
        tagPill.textContent = tag.replace(/_/g, ' '); // Replace underscores
        fragment.appendChild(tagPill);
      }
    });
    tagInfoContent.appendChild(fragment);
    tagInfoModal.classList.remove('hidden');
  }

  // --- Header Update ---
  function updateHeader() {
    if (currentSource) {
      headerContext.textContent = `Source: ${currentSource}`;
    } else {
      headerContext.textContent = 'No source selected';
    }
  }

  // --- Search Function ---
  async function performSearch() {
    if (!currentSource) {
      showMessage('Please select a source from the sidebar.', 'error');
      return;
    }

    // --- NEW: Reset state for a new search ---
    currentPage = 1;
    hasNextPage = true;
    isLoading = false;
    currentQuery = searchInput.value.trim().replace(/[, ]+/g, ' ');

    if (galleryPlaceholder) galleryPlaceholder.classList.add('hidden');
    // Clear and apply layout classes
    applyLayoutToGallery(contentGallery, currentLayout);
    contentGallery.innerHTML = ''; // Clear previous results
    updateHeader(); // Update header to show source

    // Close modal after search
    searchModal.classList.add('hidden');
    
    // Load the first page of results
    loadMoreResults();
  }

  // --- NEW: Infinite Scroll Loader ---
  async function loadMoreResults() {
    // Don't load if we're already loading or if there are no more pages
    if (isLoading || !hasNextPage) {
      return;
    }

    isLoading = true;

    // Show the correct spinner
    if (currentPage === 1) {
      loadingSpinner.classList.remove('hidden'); // Show main spinner
    } else {
      infiniteLoadingSpinner.classList.remove('hidden'); // Show bottom spinner
    }

    // Use the new API function with the current page
    const result = await window.api.search(
      currentSource,
      currentQuery,
      currentPage
    );

    // Hide all spinners
    loadingSpinner.classList.add('hidden');
    infiniteLoadingSpinner.classList.add('hidden');

    if (
      !result.success ||
      !result.data.results ||
      result.data.results.length === 0
    ) {
      hasNextPage = false; // Stop trying to load more
      if (currentPage === 1) {
        // If it's the first page and no results, show "No results"
        applyLayoutToGallery(contentGallery, currentLayout);
        contentGallery.innerHTML =
          '<p class="text-gray-400 text-center text-lg">No results found. Please try another search term.</p>';
      }
      // If it's not the first page, we just stop loading (no message needed)
      isLoading = false;
      return;
    }

    const validResults = result.data.results.filter((item) => item.image);

    if (validResults.length === 0) {
      hasNextPage = false; // Stop trying to load more
      if (currentPage === 1) {
        applyLayoutToGallery(contentGallery, currentLayout);
        contentGallery.innerHTML =
          '<p class="text-gray-400 text-center text-lg">Found results, but none had valid images.</p>';
      }
      isLoading = false;
      return;
    }

    // Use a DocumentFragment for performance
    const fragment = document.createDocumentFragment();
    validResults.forEach((item) => {
      const thumbnailUrl = item.image;
      // const fullImageUrl = getFullImageUrl(thumbnailUrl, currentSource);
      const displayUrl = item.sampleImageUrl || item.fullImageUrl || thumbnailUrl;

      const card = createImageCard(
        item.id.toString(),
        item.tags, // Pass the whole tags array
        displayUrl,   // Pass the new *real* URL
        thumbnailUrl, // Pass the *real* thumbnail as a fallback
        'browse'
      );
      fragment.appendChild(card);
    });
    // Append the new results instead of overwriting
    contentGallery.appendChild(fragment);

    // Update state for the next scroll
    hasNextPage = result.data.hasNextPage;
    currentPage++;
    isLoading = false;
  }

  // --- NEW: Scroll Event Listener for Browse Page ---
  browsePage.addEventListener('scroll', () => {
    // Check if user is near the bottom of the scrollable area
    if (
      browsePage.scrollTop + browsePage.clientHeight >=
      browsePage.scrollHeight - 600 // Load 600px before the end
    ) {
      loadMoreResults();
    }
  });

  // --- Favorites Logic ---
  async function loadFavorites() {
    // Apply layout classes
    applyLayoutToGallery(favoritesGallery, currentLayout);
    favoritesGallery.innerHTML =
      '<div class="text-center p-10"><p class="text-gray-400">Loading favorites...</p></div>';
    currentFavorites = await window.api.getFavorites();

    if (currentFavorites.length === 0) {
      // Apply layout classes
      applyLayoutToGallery(favoritesGallery, currentLayout);
      favoritesGallery.innerHTML =
        '<p class="text-gray-400 text-center text-lg">You haven\'t saved any favorites yet.</p>';
      return;
    }

    // Apply layout classes
    applyLayoutToGallery(favoritesGallery, currentLayout);
    favoritesGallery.innerHTML = ''; // Clear loading message
    const fragment = document.createDocumentFragment();
    currentFavorites.forEach((fav) => {
      const card = createImageCard(
        fav.id,
        // Read from the new 'tags' column instead of 'title'
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
    // Ensure 'tags' is an array before using array methods
    const safeTags = Array.isArray(tags) ? tags : [];
    // Title is just the first tag (or a default), for simplicity
    const title = safeTags.length > 0 ? safeTags[0] : 'Favorite';
    // Create a string of all tags to store
    const allTags = safeTags.join(',');

    const result = await window.api.addFavorite({
      id,
      title,
      imageUrl,
      thumbnailUrl,
      tags: allTags, // Pass all tags to the backend
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
      // Find the card to remove, regardless of layout
      const cardToRemove = document.querySelector(
        `#favorites-gallery [data-id='${id}']`
      );
      if (cardToRemove) {
        cardToRemove.classList.add('opacity-0', 'scale-90');
        setTimeout(() => {
          cardToRemove.remove();
          if (favoritesGallery.children.length === 0) {
            // Apply layout classes
            applyLayoutToGallery(favoritesGallery, currentLayout);
            favoritesGallery.innerHTML =
              '<p class="text-gray-400 text-center text-lg">You haven\'t saved any favorites yet.</p>';
          }
        }, 300); // Wait for animation
      }
    } else {
      showMessage(result.error, 'error');
    }
  }

  // --- UI Helpers ---

  /**
   * REWRITTEN: Creates a professional image card based on current layout.
   * @param {string} id - The unique ID of the artwork.
   * @param {string[]} tags - An array of tags.
   * @param {string} imageUrl - The full URL of the image to display.
   * @param {string} thumbnailUrl - The fallback thumbnail URL.
   * @param {'browse' | 'fav'} type - The type of card to create.
   * @returns {HTMLElement} The card element.
   */
  function createImageCard(id, tags, imageUrl, thumbnailUrl, type) {
    // Ensure 'tags' is an array before using array methods
    const safeTags = Array.isArray(tags) ? tags : [];

    // --- All layouts use this as the base card ---
    const entry = document.createElement('div');
    entry.dataset.id = id;
    entry.className = `image-entry group relative bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300`;

    // --- "Compact" layout gets a special style ---
    if (currentLayout === 'compact') {
      // Use aspect-ratio to keep cards square and uniform
      entry.classList.add('aspect-square');
    }

    // Image container with pulse animation for loading
    const imageContainer = document.createElement('div');
    imageContainer.className =
      'w-full bg-gray-700 animate-pulse relative';
    
    // For "Compact" layout, image container is also square
    if (currentLayout === 'compact') {
      imageContainer.classList.add('h-full');
    } else {
      imageContainer.classList.add('min-h-[200px]');
    }

    entry.appendChild(imageContainer);

    const img = document.createElement('img');
    img.src = imageUrl; // Try to load the full-res image first
    img.alt = safeTags.join(', '); // Use safeTags
    img.className = 'w-full h-auto object-contain bg-gray-900 opacity-0'; // Start hidden
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    
    // "Compact" layout uses "object-cover" to fill the square
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
      img.src = thumbnailUrl; // Fallback
      imageContainer.classList.remove('animate-pulse', 'bg-gray-700');
      img.classList.remove('opacity-0');
      img.classList.add('transition-opacity', 'duration-500');
      img.onerror = null; // Prevent infinite loop
    };
    imageContainer.appendChild(img);

    // --- Add buttons (overlay on hover) ---
    const buttonContainer = document.createElement('div');
    buttonContainer.className =
      'image-buttons absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200';

    // Add Info Button
    buttonContainer.appendChild(createInfoButton(safeTags));

    if (type === 'browse') {
      buttonContainer.appendChild(
        createAddFavoriteButton(id, safeTags, imageUrl, thumbnailUrl)
      );
    } else {
      buttonContainer.appendChild(createRemoveFavoriteButton(id));
    }
    imageContainer.appendChild(buttonContainer); // Add buttons to image container

    return entry;
  }

  /**
   * Tries to guess the full-resolution image URL from a thumbnail URL.
   * This is a "best guess" based on common patterns.
   * @param {string} thumbnailUrl - The URL of the thumbnail.
   * @param {string} source - The name of the source (e.g., 'Gelbooru', 'Rule34').
   * @returns {string} The guessed full-resolution URL.
   */
  function getFullImageUrl(thumbnailUrl, source) {
    if (!thumbnailUrl) return '';

    try {
      // Waifu.pics API already provides the full URL
      if (source === 'WaifuPics') {
        return thumbnailUrl;
      }

      // Rule34 (API): preview_url -> file_url
      if (source === 'Rule34' && thumbnailUrl.includes('thumbnail_')) {
        return thumbnailUrl
          .replace('/thumbnails/', '/images/')
          .replace('thumbnail_', '');
      }
      
      // Gelbooru (Scraper): /thumbnails/ -> /images/
      if (source === 'Gelbooru' && thumbnailUrl.includes('/thumbnails/')) {
        return thumbnailUrl
          .replace('/thumbnails/', '/images/')
          .replace('thumbnail_', '');
      }
      
      // Safebooru (Scraper): /thumbnails/ -> /images/
      if (source === 'Safebooru' && thumbnailUrl.includes('/thumbnails/')) {
        return thumbnailUrl
          .replace('/thumbnails/', '/images/')
          .replace('thumbnail_', '');
      }
      
      // Fallback for unknown scrapers
      if (thumbnailUrl.includes('/thumbnails/')) {
         return thumbnailUrl
          .replace('/thumbnails/', '/images/')
          .replace('thumbnail_', '');
      }

    } catch (e) {
      console.error('Error parsing full image URL:', e);
    }
    // If no rules match, just return the thumbnail URL
    return thumbnailUrl;
  }

  // --- Button Creation Helpers ---
  function createInfoButton(safeTags) {
    const button = document.createElement('button');
    button.title = 'Show Info';
    button.className =
      'p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 backdrop-blur-sm transition-colors';
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>`;
    button.onclick = (e) => {
      e.stopPropagation(); // Prevent card click
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
      e.stopPropagation(); // Prevent card click
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
      e.stopPropagation(); // Prevent card click
      handleRemoveFavorite(id);
    };
    return button;
  }
  // --- END NEW: Button Creation Helpers ---

  /**
   * Shows a green/red message bar at the bottom of the screen.
   * @param {string} message - The text to display.
   * @param {'success' | 'error'} type - The type of message.
   */
  function showMessage(message, type = 'success') {
    if (!messageBar) return;
    messageBar.textContent = message;

    // Set color
    if (type === 'error') {
      messageBar.classList.remove('bg-green-600');
      messageBar.classList.add('bg-red-600');
    } else {
      messageBar.classList.remove('bg-red-600');
      messageBar.classList.add('bg-green-600');
    }

    // Show
    messageBar.classList.remove('hidden', 'translate-y-16');

    // Hide after 3 seconds
    setTimeout(() => {
      messageBar.classList.add('hidden', 'translate-y-16');
    }, 3000);
  }

  // --- NEW: Settings Logic ---
  function loadSettings() {
    const savedLayout = localStorage.getItem('waifuBoardLayout') || 'scroll';
    currentLayout = savedLayout;
    
    // Check if the saved layout element exists before trying to check it
    const savedRadio = document.querySelector(
      `input[name="layout"][value="${savedLayout}"]`
    );
    if (savedRadio) {
      savedRadio.checked = true;
    } else {
      // Fallback if saved layout is invalid
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

    // Re-render the current view
    if (browsePage.classList.contains('hidden')) {
      loadFavorites(); // Re-render favorites
    } else {
      // --- FIX ---
      // Only re-run the search if there was a query.
      if (currentQuery) {
        performSearch(); // Re-render browse (will reset to page 1)
      } else {
        applyLayoutToGallery(contentGallery, currentLayout);
      }
    }
  }

  function applyLayoutToGallery(galleryElement, layout) {
    // Reset all layout classes
    galleryElement.className = 'p-4 w-full'; // Base classes

    if (layout === 'scroll') {
      galleryElement.classList.add('max-w-3xl', 'mx-auto', 'space-y-8');
    } else if (layout === 'grid') {
      // Use the Masonry layout class
      galleryElement.classList.add('gallery-masonry');
    } else if (layout === 'compact') {
      // Use the standard grid layout (formerly 'gallery-grid')
      galleryElement.classList.add('gallery-grid');
    }
  }

  layoutRadios.forEach((radio) => {
    radio.addEventListener('change', handleLayoutChange);
  });
  // --- END NEW: Settings Logic ---

  // --- Initial Load ---
  loadSettings(); // NEW: Load settings on startup
  populateSources(); // Load the sources into the dropdown on startup
  showPage('browse-page'); // Show the browse page on startup
});