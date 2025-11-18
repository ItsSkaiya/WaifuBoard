/*
  preload.js
  This script runs in a special, isolated context before the web page (index.html)
  is loaded. It uses 'contextBridge' to securely expose specific functions
  from the main process (like database access) to the renderer process (frontend).
*/
const { contextBridge, ipcRenderer } = require('electron');

// Expose a 'db' object to the global 'window' object in the renderer
contextBridge.exposeInMainWorld('api', {
  // --- Database Functions ---
  getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
  addFavorite: (fav) => ipcRenderer.invoke('db:addFavorite', fav),
  removeFavorite: (id) => ipcRenderer.invoke('db:removeFavorite', id),

  // --- API Function ---
  // This is now a generic search function that takes the source
  search: (source, query) => ipcRenderer.invoke('api:search', source, query),
  // NEW: This function gets the list of available sources from main.js
  getSources: () => ipcRenderer.invoke('api:getSources'),
});