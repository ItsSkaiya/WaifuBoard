const { BrowserWindow } = require('electron');

class HeadlessBrowser {
  async scrape(url, evalFunc, options = {}) {
    const { 
        waitSelector = null, 
        timeout = 15000, 
        args = [],
        scrollToBottom = false,
        renderWaitTime = 2000,
        loadImages = true 
    } = options; 

    const win = new BrowserWindow({
      show: false, 
      width: 1920, 
      height: 1080,
      webPreferences: {
        offscreen: true,  
        contextIsolation: false,  
        nodeIntegration: false,
        images: loadImages, 
        webgl: false,   
        backgroundThrottling: false,
      },
    });

    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      win.webContents.setUserAgent(userAgent);

      const session = win.webContents.session;
      session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        const url = details.url.toLowerCase();
        const blockExtensions = [
          '.woff', '.woff2', '.ttf', '.eot', 
          'google-analytics', 'doubleclick', 'facebook', 'twitter', 'adsystem'
        ];
        if (blockExtensions.some(ext => url.includes(ext))) return callback({ cancel: true });
        return callback({ cancel: false });
      });

      await win.loadURL(url, { userAgent });

      if (waitSelector) {
        try {
            await this.waitForSelector(win, waitSelector, timeout);
        } catch (e) {
            console.warn(`[Headless] Timeout waiting for ${waitSelector}, proceeding anyway...`);
        }
      }

      if (scrollToBottom) {
          await this.smoothScrollToBottom(win);
      }

      if (renderWaitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, renderWaitTime));
      }

      const result = await win.webContents.executeJavaScript(
        `(${evalFunc.toString()}).apply(null, ${JSON.stringify(args)})`
      );
      
      return result;

    } catch (error) {
      console.error('Headless Scrape Error:', error.message);
      throw error;
    } finally {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    }
  }

  async waitForSelector(win, selector, timeout) {
    const script = `
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Timeout waiting for selector: ${selector}'));
        }, ${timeout});

        const check = () => {
          const el = document.querySelector('${selector}');
          if (el) {
            clearTimeout(timer);
            resolve(true);
          } else {
            setTimeout(check, 200); 
          }
        };
        check();
      });
    `;
    await win.webContents.executeJavaScript(script);
  }

  async smoothScrollToBottom(win) {
    const script = `
        new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400; 
            const maxScrolls = 200; 
            let currentScrolls = 0;

            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                currentScrolls++;

                if(totalHeight >= scrollHeight - window.innerHeight || currentScrolls >= maxScrolls){
                    clearInterval(timer);
                    resolve();
                }
            }, 20); 
        });
    `;
    await win.webContents.executeJavaScript(script);
  }
}

module.exports = new HeadlessBrowser();