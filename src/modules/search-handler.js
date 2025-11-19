let currentPage = 1;
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

  currentPage = 1;
  hasNextPage = true;
  isLoading = false;
  currentQuery = searchInput.value.trim().replace(/[, ]+/g, ' ');

  if (galleryPlaceholder) galleryPlaceholder.classList.add('hidden');

  applyLayoutToGallery(contentGallery, currentLayout);
  contentGallery.innerHTML = '';
  updateHeader();

  searchModal.classList.add('hidden');

  await loadMoreResults(currentSource, currentLayout, domRefs, callbacks);
}

export async function loadMoreResults(
  currentSource,
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