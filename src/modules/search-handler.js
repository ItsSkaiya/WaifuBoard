let hasNextPage = true;
let isLoading = false;
let currentQuery = '';

export async function performSearch(
  currentSource,
  searchInput,
  currentLayout,
  domRefs,
  callbacks
) {
  const { showMessage, applyLayoutToGallery, updateHeader } = callbacks;
  const { galleryPlaceholder, contentGallery, searchModal } = domRefs;

  if (!currentSource) {
    showMessage('Please select a source from the sidebar.', 'error');
    return;
  }

  hasNextPage = true;
  isLoading = false;
  currentQuery = searchInput.value ? searchInput.value.trim().replace(/[, ]+/g, ' ') : '';

  if (galleryPlaceholder) galleryPlaceholder.classList.add('hidden');

  applyLayoutToGallery(contentGallery, currentLayout);
  contentGallery.innerHTML = '';
  updateHeader();

  searchModal.classList.add('hidden');

  await loadMoreResults(currentSource, 1, currentLayout, domRefs, callbacks);
}

export async function loadMoreResults(
  currentSource,
  page, 
  currentLayout,
  domRefs,
  callbacks
) {
  const { loadingSpinner, infiniteLoadingSpinner, contentGallery } = domRefs;
  const { applyLayoutToGallery, createImageCard } = callbacks;

  if (isLoading || !hasNextPage) {
    return;
  }

  isLoading = true;

  if (page === 1) {
    if(loadingSpinner) loadingSpinner.classList.remove('hidden');
  } else {
    if(infiniteLoadingSpinner) infiniteLoadingSpinner.classList.remove('hidden');
  }

  try {
      const result = await window.api.search(
        currentSource,
        currentQuery,
        page
      );

      if (loadingSpinner) loadingSpinner.classList.add('hidden');
      if (infiniteLoadingSpinner) infiniteLoadingSpinner.classList.add('hidden');

      if (
        !result.success ||
        !result.data.results ||
        result.data.results.length === 0
      ) {
        hasNextPage = false;
        if (page === 1) {
          applyLayoutToGallery(contentGallery, currentLayout);
          contentGallery.innerHTML =
            '<p class="text-gray-400 text-center text-lg">No results found. Please try another search term.</p>';
        }
        isLoading = false;
        return;
      }

      const validResults = result.data.results.filter((item) => item.image);

      if (validResults.length === 0) {
        if (page === 1) {
           hasNextPage = false;
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
      
      applyLayoutToGallery(contentGallery, currentLayout);

      hasNextPage = result.data.hasNextPage;
      
  } catch (error) {
      console.error("Search/Load Error:", error);
      if (loadingSpinner) loadingSpinner.classList.add('hidden');
      if (infiniteLoadingSpinner) infiniteLoadingSpinner.classList.add('hidden');
  } finally {
      isLoading = false;
  }
}