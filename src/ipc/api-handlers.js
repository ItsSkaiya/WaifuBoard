const fs = require('fs');
const fetchPath = require.resolve('node-fetch');
const cheerioPath = require.resolve('cheerio');

function peekProperty(filePath, propertyName) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const regex = new RegExp(`(?:this\\.|^|\\s)${propertyName}\\s*=\\s*["']([^"']+)["']`);
        const match = content.match(regex);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

module.exports = function (availableScrapers, headlessBrowser) {
  
  Object.keys(availableScrapers).forEach(name => {
      const scraper = availableScrapers[name];
      
      if (!scraper.url) {
          if (scraper.instance && scraper.instance.baseUrl) {
              scraper.url = scraper.instance.baseUrl;
          } else {
              scraper.url = peekProperty(scraper.path, 'baseUrl');
          }
      }

      if (!scraper.type) {
          if (scraper.instance && scraper.instance.type) {
              scraper.type = scraper.instance.type;
          } else {
              const typeFromFile = peekProperty(scraper.path, 'type');
              if (typeFromFile) {
                  console.log(`[API] Recovered type for ${name} via static analysis: ${typeFromFile}`);
                  scraper.type = typeFromFile;
              }
          }
      }
  });

  return {
    getSources: () => {
      console.log("[API] Handling getSources request...");
      
      const results = Object.keys(availableScrapers).map((name) => {
        const scraper = availableScrapers[name];
        
        const typeToReturn = scraper.type || null;

        console.log(`[API] Processing ${name}: Type found = "${typeToReturn}"`);

        return {
          name: name,
          url: scraper.url || name,
          type: typeToReturn
        };
      });

      return results;
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
          
          if (instance.type) scraperData.type = instance.type;
          if (instance.baseUrl) scraperData.url = instance.baseUrl;

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