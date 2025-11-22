const fs = require('fs');
const fetchPath = require.resolve('node-fetch');
const cheerioPath = require.resolve('cheerio');
const fetch = require(fetchPath);

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
              if (typeFromFile) scraper.type = typeFromFile;
          }
      }
  });

  const getScraperInstance = (source) => {
      const scraperData = availableScrapers[source];
      if (!scraperData) throw new Error(`Source ${source} not found.`);

      if (!scraperData.instance) {
          console.log(`[LazyLoad] Initializing scraper: ${source}...`);
          const scraperModule = require(scraperData.path);
          const className = Object.keys(scraperModule)[0]; 
          const ScraperClass = scraperModule[className];
          const instance = new ScraperClass(fetchPath, cheerioPath, headlessBrowser);
          scraperData.instance = instance;
          
          if (instance.type) scraperData.type = instance.type;
          if (instance.baseUrl) scraperData.url = instance.baseUrl;
      }
      return scraperData.instance;
  };

  return {
    getSources: () => {
      return Object.keys(availableScrapers).map((name) => {
        const scraper = availableScrapers[name];
        return {
          name: name,
          url: scraper.url || name,
          type: scraper.type || (scraper.instance ? scraper.instance.type : null)
        };
      });
    },

    search: async (event, source, query, page) => {
      try {
        const instance = getScraperInstance(source);
        const results = await instance.fetchSearchResult(query, page);
        return { success: true, data: results };
      } catch (err) {
        console.error(`Error during search in ${source}:`, err);
        return { success: false, error: err.message };
      }
    },

    getChapters: async (event, source, mangaId) => {
        try {
            const instance = getScraperInstance(source);
            if (!instance.findChapters) throw new Error("Extension does not support chapters.");
            
            const result = await instance.findChapters(mangaId);
            
            if (Array.isArray(result)) {
                return { success: true, data: result };
            } else if (result && result.chapters) {
                return { success: true, data: result.chapters, extra: { cover: result.cover } };
            }
            
            return { success: true, data: [] };

        } catch (err) {
            console.error(`Error fetching chapters from ${source}:`, err);
            return { success: false, error: err.message };
        }
    },

    getPages: async (event, source, chapterId) => {
        try {
            const instance = getScraperInstance(source);
            if (!instance.findChapterPages) throw new Error("Extension does not support reading pages.");
            const pages = await instance.findChapterPages(chapterId);
            return { success: true, data: pages };
        } catch (err) {
            console.error(`Error fetching pages from ${source}:`, err);
            return { success: false, error: err.message };
        }
    },

    getMetadata: async (event, title) => {
        let cleanTitle = title.replace(/(\[.*?\]|\(.*?\))/g, '').trim().replace(/\s+/g, ' ');
        console.log(`[AniList] Searching for: "${cleanTitle}"`);

        const query = `
        query ($search: String, $type: MediaType) {
          Media (search: $search, type: $type, sort: SEARCH_MATCH) {
            id
            title { romaji english native }
            description(asHtml: false)
            averageScore
            genres
            coverImage { extraLarge large }
            characters(page: 1, perPage: 10, sort: ROLE) {
              edges {
                role
                node { id name { full } image { medium } }
              }
            }
          }
        }
        `;

        try {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables: { search: cleanTitle, type: 'MANGA' } })
            });

            const json = await response.json();
            if (json.errors || !json.data || !json.data.Media) {
                return { success: false, error: "No media found" };
            }
            return { success: true, data: json.data.Media };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
  };
};