const sqlite3 = require('sqlite3').verbose();

function runDatabaseMigrations(db) {
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
      if (err) return console.error('Failed to get table info:', err.message);
      
      const hasThumbnailColumn = columns.some((col) => col.name === 'thumbnail_url');

      if (!hasThumbnailColumn) {
        console.log('MIGRATION: Adding "thumbnail_url" column...');
        db.run(
          'ALTER TABLE favorites ADD COLUMN thumbnail_url TEXT NOT NULL DEFAULT ""',
          (err) => {
            if (err) console.error('Migration error (thumbnail_url):', err.message);
            else console.log('MIGRATION: "thumbnail_url" added successfully.');
          }
        );
      } else {
        console.log('"thumbnail_url" column is up-to-date.');
      }
    });

    console.log('Checking database schema for "tags" column...');
    db.all('PRAGMA table_info(favorites)', (err, columns) => {
      if (err) return console.error('Failed to get table info:', err.message);
      
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

function initDatabase(dbPath) {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the favorites database.');
      runDatabaseMigrations(db);
    }
  });
  return db;
}

module.exports = initDatabase;