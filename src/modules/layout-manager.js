export function applyLayoutToGallery(galleryElement, layout) {
  if (!galleryElement) return;
  
  galleryElement.className = 'p-4 w-full';

  if (layout === 'scroll') {
    galleryElement.classList.add('max-w-3xl', 'mx-auto', 'space-y-8');
  } else if (layout === 'grid') {
    galleryElement.classList.add('gallery-masonry');
  } else if (layout === 'compact') {
    galleryElement.classList.add('gallery-grid');
  }
}

export function loadSavedLayout() {
  const savedLayout = localStorage.getItem('waifuBoardLayout') || 'scroll';
  
  const savedRadio = document.querySelector(`input[name="layout"][value="${savedLayout}"]`);
  if (savedRadio) {
    savedRadio.checked = true;
  } else {
    const defaultRadio = document.getElementById('layout-scroll');
    if(defaultRadio) defaultRadio.checked = true;
  }
  
  return savedLayout;
}

export function saveLayout(newLayout) {
  localStorage.setItem('waifuBoardLayout', newLayout);
  console.log('Layout changed to:', newLayout);
}