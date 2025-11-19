const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const initDatabase = require('./src/database/db-init');

const { initDiscordRPC } = require('./src/discord-rpc');
const headlessBrowser = require('./src/utils/headless-browser'); 

const fetchPath = require.resolve('node-fetch');
const cheerioPath = require.resolve('cheerio');

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

const loadedScrapers = {};

function loadScrapers() {
  console.log('Loading scrapers...');
  console.log(`Checking for plugins in: ${pluginsPath}`);

  const files = fs.readdirSync(pluginsPath);
  files
    .filter((file) => file.endsWith('.js'))
    .forEach((file) => {
      const filePath = path.join(pluginsPath, file);
      try {
        const scraperModule = require(filePath);
        const className = Object.keys(scraperModule)[0];
        const ScraperClass = scraperModule[className];

        if (
          typeof ScraperClass === 'function' &&
          ScraperClass.prototype.fetchSearchResult
        ) {
          const instance = new ScraperClass(fetchPath, cheerioPath, headlessBrowser);

          loadedScrapers[className] = {
            instance: instance,
            baseUrl: instance.baseUrl,
          };
          console.log(
            `Successfully loaded scraper: ${className} from ${instance.baseUrl}`
          );
        } else {
          console.warn(`File ${file} does not export a valid scraper class.`);
        }
      } catch (error) {
        console.error(`Failed to load scraper from ${file}:`, error);
      }
    });
}

loadScrapers();

const db = initDatabase(dbPath);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
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

const apiHandlers = require('./src/ipc/api-handlers')(loadedScrapers);
const dbHandlers = require('./src/ipc/db-handlers')(db);

ipcMain.handle('api:getSources', apiHandlers.getSources);
ipcMain.handle('api:search', apiHandlers.search);

ipcMain.handle('db:getFavorites', dbHandlers.getFavorites);
ipcMain.handle('db:addFavorite', dbHandlers.addFavorite);
ipcMain.handle('db:removeFavorite', dbHandlers.removeFavorite);