export function setupGlobalKeybinds(searchModal) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchModal.classList.add('hidden');
    }
  });
}