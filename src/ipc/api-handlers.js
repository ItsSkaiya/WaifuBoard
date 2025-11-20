const fs = require('fs');
const fetchPath = require.resolve('node-fetch');
const cheerioPath = require.resolve('cheerio');

function peekBaseUrl(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const match = content.match(/baseUrl\s*=\s*["']([^"']+)["']/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

module.exports = function (availableScrapers, headlessBrowser) {
  
  Object.keys(availableScrapers).forEach(name => {
      const scraper = availableScrapers[name];
      if (!scraper.url) {
          const url = peekBaseUrl(scraper.path);
          if (url) {
              scraper.url = url;
          }
      }
  });

  return {
    getSources: () => {
      return Object.keys(availableScrapers).map((name) => {
        const scraper = availableScrapers[name];
        return {
          name: name,
          url: scraper.url || name 
        };
      });
    },

    search: async (event, source, query, page) => {
      const scraperData = availableScrapers[source];

      if (!scraperData) {
        return { success: false, error: `Source ${source} not found.` };
      }

      if (!scraperData.instance) {
        console.log(`[LazyLoad] Initializing scraper: ${source}...`);
        try {
          const scraperModule = require(scraperData.path);
          
          const className = Object.keys(scraperModule)[0]; 
          const ScraperClass = scraperModule[className];

          if (!ScraperClass || typeof ScraperClass !== 'function') {
              throw new Error(`File ${scraperData.path} does not export a valid class.`);
          }

          const instance = new ScraperClass(fetchPath, cheerioPath, headlessBrowser);

          scraperData.instance = instance;
          
          if (instance.baseUrl) {
            scraperData.url = instance.baseUrl;
          }

        } catch (err) {
          console.error(`Failed to lazy load ${source}:`, err);
          return { success: false, error: `Failed to load extension: ${err.message}` };
        }
      }

      try {
        const results = await scraperData.instance.fetchSearchResult(query, page);
        return { success: true, data: results };
      } catch (err) {
        console.error(`Error during search in ${source}:`, err);
        return { success: false, error: err.message };
      }
    }
  };
};