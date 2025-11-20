export function setupGlobalKeybinds() {
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault(); 
      
      if (window.api && window.api.toggleDevTools) {
        window.api.toggleDevTools();
      } else {
        console.warn('window.api.toggleDevTools is not defined in preload.js');
      }
    }
  });
}