/*
  main.js (Electron Main Process)
  MODIFIED: Swapped 'better-sqlite3' for 'sqlite3' to remove C++ dependency.
*/
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
// --- NEW: Get paths for *both* dependencies ---
const fetchPath = require.resolve('node-fetch');
const cheerioPath = require.resolve('cheerio');
// --- END NEW ---

// --- Core paths ---
const waifuBoardsPath = path.join(app.getPath('home'), 'WaifuBoards');
const pluginsPath = path.join(waifuBoardsPath, 'extensions');
const dbPath = path.join(waifuBoardsPath, 'favorites.db');

// --- Ensure directories exist ---
try {
  if (!fs.existsSync(waifuBoardsPath)) {
    fs.mkdirSync(waifuBoardsPath);
  }
  if (!fs.existsSync(pluginsPath)) {
    // Use recursive: true in case WaifuBoards doesn't exist yet
    fs.mkdirSync(pluginsPath, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create directories:', error);
  // We can probably continue, but loading/saving will fail.
}

// --- API Scraper Loader ---
// This will hold our instantiated scraper classes, e.g. { 'Gelbooru': new Gelbooru() }
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
        // Dynamically require the scraper file
        const scraperModule = require(filePath);
        // We assume the export is an object like { Gelbooru: class... }
        const className = Object.keys(scraperModule)[0];
        const ScraperClass = scraperModule[className];

        // Basic check to see if it's a valid scraper class
        if (
          typeof ScraperClass === 'function' &&
          ScraperClass.prototype.fetchSearchResult
        ) {
          // --- MODIFIED: Inject *both* paths ---
          const instance = new ScraperClass(fetchPath, cheerioPath);
          // --- END MODIFIED ---
          
          // Store the instance and its baseUrl
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
// --------------------

// Load scrapers at startup
loadScrapers();

// --- MODIFIED: Initialize sqlite3 (async) ---
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the favorites database.');
    runDatabaseMigrations(); // Run migrations after connecting
  }
});

// --- MODIFIED: Database functions are now async ---
function runDatabaseMigrations() {
  db.serialize(() => {
    // Create the 'favorites' table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL DEFAULT "",
        tags TEXT NOT NULL DEFAULT ""
      )
    `,
      (err) => {
        if (err) console.error('Error creating table:', err.message);
      }
    );

    // --- Migration (Add thumbnail_url) ---
    console.log('Checking database schema for "thumbnail_url"...');
    db.all('PRAGMA table_info(favorites)', (err, columns) => {
      if (err) {
        console.error('Failed to get table info:', err.message);
        return;
      }
      const hasThumbnailColumn = columns.some(
        (col) => col.name === 'thumbnail_url'
      );

      if (!hasThumbnailColumn) {
        console.log(
          'MIGRATION: Adding "thumbnail_url" column...'
        );
        db.run(
          'ALTER TABLE favorites ADD COLUMN thumbnail_url TEXT NOT NULL DEFAULT ""',
          (err) => {
            if (err)
              console.error('Migration error (thumbnail_url):', err.message);
            else console.log('MIGRATION: "thumbnail_url" added successfully.');
          }
        );
      } else {
        console.log('"thumbnail_url" column is up-to-date.');
      }
    });

    // --- Migration (Add tags) ---
    console.log('Checking database schema for "tags" column...');
    db.all('PRAGMA table_info(favorites)', (err, columns) => {
      if (err) {
        console.error('Failed to get table info:', err.message);
        return;
      }
      const hasTagsColumn = columns.some((col) => col.name === 'tags');

      if (!hasTagsColumn) {
        console.log('MIGRATION: Adding "tags" column...');
        db.run(
          'ALTER TABLE favorites ADD COLUMN tags TEXT NOT NULL DEFAULT ""',
          (err) => {
            if (err) console.error('Migration error (tags):', err.message);
            else console.log('MIGRATION: "tags" column added successfully.');
          }
        );
      } else {
        console.log('"tags" column is up-to-date.');
      }
    });
  });
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      // Attach the 'preload.js' script to the window
      // This is the secure way to expose Node.js functions to the renderer (frontend)
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation is true by default and is a critical security feature
      contextIsolation: true,
      // nodeIntegration should be false
      nodeIntegration: false,
    },
  });

  // Load the index.html file into the window
  mainWindow.loadFile('index.html');

  // --- Add this line to remove the menu bar ---
  mainWindow.setMenu(null);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // loadScrapers(); // MOVED: This is now called at the top
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
    });
    app.quit();
  }
});

// --- IPC Handlers (Backend Functions) ---
// These functions listen for calls from the 'preload.js' script

// NEW: Send the list of loaded scrapers to the frontend
ipcMain.handle('api:getSources', () => {
  // Returns an array of objects: [{ name: 'Gelbooru', url: 'https://gelbooru.com' }, ...]
  return Object.keys(loadedScrapers).map((name) => {
    return {
      name: name,
      url: loadedScrapers[name].baseUrl,
    };
  });
});

// MODIFIED: Generic search handler now accepts a page number
ipcMain.handle('api:search', async (event, source, query, page) => {
  try {
    // Check if the requested source was successfully loaded
    if (loadedScrapers[source] && loadedScrapers[source].instance) {
      // Pass the page number to the scraper
      const results = await loadedScrapers[source].instance.fetchSearchResult(
        query,
        page
      );
      return { success: true, data: results };
    } else {
      throw new Error(`Unknown source or source failed to load: ${source}`);
    }
  } catch (error) {
    console.error(`Error searching ${source}:`, error);
    return { success: false, error: error.message };
  }
});

// --- MODIFIED: All db handlers are now async Promises ---

// Handle request to get all favorites
ipcMain.handle('db:getFavorites', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM favorites', [], (err, rows) => {
      if (err) {
        console.error('Error getting favorites:', err.message);
        resolve([]); // Resolve with empty array on error
      } else {
        resolve(rows);
      }
    });
  });
});

// Handle request to add a favorite
ipcMain.handle('db:addFavorite', (event, fav) => {
  return new Promise((resolve) => {
    const stmt =
      'INSERT INTO favorites (id, title, image_url, thumbnail_url, tags) VALUES (?, ?, ?, ?, ?)';
    db.run(
      stmt,
      [fav.id, fav.title, fav.imageUrl, fav.thumbnailUrl, fav.tags],
      function (err) {
        // Must use 'function' to get 'this'
        if (err) {
          if (err.code.includes('SQLITE_CONSTRAINT')) {
            resolve({ success: false, error: 'Item is already a favorite.' });
          } else {
            console.error('Error adding favorite:', err.message);
            resolve({ success: false, error: err.message });
          }
        } else {
          resolve({ success: true, id: fav.id });
        }
      }
    );
  });
});

// Handle request to remove a favorite
ipcMain.handle('db:removeFavorite', (event, id) => {
  return new Promise((resolve) => {
    const stmt = 'DELETE FROM favorites WHERE id = ?';
    db.run(stmt, id, function (err) {
      // Must use 'function' to get 'this'
      if (err) {
        console.error('Error removing favorite:', err.message);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: this.changes > 0 });
      }
    });
  });
});