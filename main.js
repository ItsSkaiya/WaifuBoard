const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

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

          const instance = new ScraperClass(fetchPath, cheerioPath);

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

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the favorites database.');
    runDatabaseMigrations(); 
  }
});

function runDatabaseMigrations() {
  db.serialize(() => {

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

  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {

      preload: path.join(__dirname, '/scripts/preload.js'),

      contextIsolation: true,

      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('views/index.html');

  mainWindow.setMenu(null);
}

app.whenReady().then(() => {
  createWindow();

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

ipcMain.handle('api:getSources', () => {
  return Object.keys(loadedScrapers).map((name) => {
    return {
      name: name,
      url: loadedScrapers[name].baseUrl,
    };
  });
});

ipcMain.handle('api:search', async (event, source, query, page) => {
  try {
    if (loadedScrapers[source] && loadedScrapers[source].instance) {
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
ipcMain.handle('db:getFavorites', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM favorites', [], (err, rows) => {
      if (err) {
        console.error('Error getting favorites:', err.message);
        resolve([]); 
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('db:addFavorite', (event, fav) => {
  return new Promise((resolve) => {
    const stmt =
      'INSERT INTO favorites (id, title, image_url, thumbnail_url, tags) VALUES (?, ?, ?, ?, ?)';
    db.run(
      stmt,
      [fav.id, fav.title, fav.imageUrl, fav.thumbnailUrl, fav.tags],
      function (err) {

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

ipcMain.handle('db:removeFavorite', (event, id) => {
  return new Promise((resolve) => {
    const stmt = 'DELETE FROM favorites WHERE id = ?';
    db.run(stmt, id, function (err) {

      if (err) {
        console.error('Error removing favorite:', err.message);
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: this.changes > 0 });
      }
    });
  });
});