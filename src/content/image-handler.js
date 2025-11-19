import { createAddFavoriteButton, createRemoveFavoriteButton } from '../favorites/favorites-handler.js';

export function populateTagModal(container, tags) {
  container.innerHTML = '';

  if (!tags || tags.length === 0) {
    container.innerHTML =
      '<p class="text-gray-400">No tags available for this image.</p>';
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
  container.appendChild(fragment);
}

function createInfoButton(safeTags, showTagModalCallback) {
  const button = document.createElement('button');
  button.title = 'Show Info';
  button.className =
    'p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 backdrop-blur-sm transition-colors';
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>`;
  button.onclick = (e) => {
    e.stopPropagation();
    showTagModalCallback(safeTags);
  };
  return button;
}

export function createImageCard(id, tags, imageUrl, thumbnailUrl, type, context) {
  const { 
    currentLayout, 
    showMessage, 
    showTagModal, 
    applyLayoutToGallery, 
    favoritesGallery 
  } = context;

  const safeTags = Array.isArray(tags) ? tags : [];

  const entry = document.createElement('div');
  entry.dataset.id = id;
  entry.className = `image-entry group relative bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300`;

  if (currentLayout === 'compact') {
    entry.classList.add('aspect-square');
  }

  const imageContainer = document.createElement('div');
  imageContainer.className = 'w-full bg-gray-700 animate-pulse relative';

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

  buttonContainer.appendChild(createInfoButton(safeTags, showTagModal));

  if (type === 'browse') {
    buttonContainer.appendChild(
      createAddFavoriteButton(id, safeTags, imageUrl, thumbnailUrl, showMessage)
    );
  } else {
    buttonContainer.appendChild(
      createRemoveFavoriteButton(id, favoritesGallery, showMessage, applyLayoutToGallery, currentLayout)
    );
  }
  imageContainer.appendChild(buttonContainer);

  return entry;
}