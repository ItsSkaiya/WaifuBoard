module.exports = function (loadedScrapers) {
  return {
    getSources: () => {
      return Object.keys(loadedScrapers).map((name) => {
        return {
          name: name,
          url: loadedScrapers[name].baseUrl,
        };
      });
    },

    search: async (event, source, query, page) => {
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
    },
  };
};