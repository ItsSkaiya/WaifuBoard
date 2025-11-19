module.exports = function (db) {
  return {
    getFavorites: () => {
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
    },

    addFavorite: (event, fav) => {
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
    },

    removeFavorite: (event, id) => {
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
    },
  };
};