const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
  addFavorite: (fav) => ipcRenderer.invoke('db:addFavorite', fav),
  removeFavorite: (id) => ipcRenderer.invoke('db:removeFavorite', id),

  getChapters: (source, mangaId) => ipcRenderer.invoke('api:getChapters', source, mangaId),
  getPages: (source, chapterId) => ipcRenderer.invoke('api:getPages', source, chapterId),

  search: (source, query, page) => ipcRenderer.invoke('api:search', source, query, page),
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),

  getSources: () => ipcRenderer.invoke('api:getSources'),
});