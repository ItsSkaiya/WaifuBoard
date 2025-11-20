const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const initDatabase = require('./src/database/db-init');

const { initDiscordRPC } = require('./src/discord-rpc');
const headlessBrowser = require('./src/utils/headless-browser'); 

const waifuBoardsPath = path.join(app.getPath('home'), 'WaifuBoards');
const pluginsPath = path.join(waifuBoardsPath, 'extensions');
const dbPath = path.join(waifuBoardsPath, 'favorites.db');

try {
  if (!fs.existsSync(waifuBoardsPath)) {
    fs.mkdirSync(waifuBoardsPath);
  }
  if (!fs.existsSync(pluginsPath)) {
    fs.mkdirSync(pluginsPath, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create directories:', error);
}

const availableScrapers = {};

function loadScrapers() {
  console.log('Scanning for plugins...');
  
  let files = [];
  try {
      files = fs.readdirSync(pluginsPath).filter((file) => file.endsWith('.js'));
  } catch (e) {
      console.error("Failed to read plugins directory", e);
      return;
  }

  files.forEach((file) => {
      const name = file.replace('.js', ''); 
      const filePath = path.join(pluginsPath, file);
      
      availableScrapers[name] = {
          name: name,
          path: filePath,
          instance: null 
      };
  });
  
  console.log(`Found ${files.length} plugins. (Lazy Loaded)`);
}


loadScrapers();

const db = initDatabase(dbPath);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1324,
    height: 868,
    webPreferences: {
      preload: path.join(__dirname, '/src/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('views/index.html');
  mainWindow.setMenu(null);
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  initDiscordRPC();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
    });
    app.quit();
  }
});

const apiHandlers = require('./src/ipc/api-handlers')(availableScrapers, headlessBrowser);
const dbHandlers = require('./src/ipc/db-handlers')(db);

ipcMain.handle('api:getSources', apiHandlers.getSources);
ipcMain.handle('api:search', apiHandlers.search);

ipcMain.handle('db:getFavorites', dbHandlers.getFavorites);
ipcMain.handle('db:addFavorite', dbHandlers.addFavorite);
ipcMain.handle('db:removeFavorite', dbHandlers.removeFavorite);