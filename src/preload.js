const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
  addFavorite: (fav) => ipcRenderer.invoke('db:addFavorite', fav),
  removeFavorite: (id) => ipcRenderer.invoke('db:removeFavorite', id),

  search: (source, query, page) => ipcRenderer.invoke('api:search', source, query, page),
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),

  getSources: () => ipcRenderer.invoke('api:getSources'),
});