const { BrowserWindow } = require('electron');

class HeadlessBrowser {
  async scrape(url, evalFunc, options = {}) {
    const { waitSelector = null, timeout = 15000 } = options;

    const win = new BrowserWindow({
      show: false, 
      width: 1920, 
      height: 1080,
      webPreferences: {
        offscreen: true,  
        contextIsolation: false,  
        nodeIntegration: false,
        images: false, 
        webgl: false,   
        backgroundThrottling: false,
      },
    });

    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      win.webContents.setUserAgent(userAgent);

      const session = win.webContents.session;
      const filter = { urls: ['*://*/*'] };
      
      session.webRequest.onBeforeRequest(filter, (details, callback) => {
        const url = details.url.toLowerCase();
        
        const blockExtensions = [
          '.css', '.woff', '.woff2', '.ttf', '.svg', '.eot', 
          'google-analytics', 'doubleclick', 'facebook', 'twitter', 'adsystem' 
        ];

        const isBlocked = blockExtensions.some(ext => url.includes(ext));

        if (isBlocked) {
          return callback({ cancel: true }); 
        }

        return callback({ cancel: false });
      });

      await win.loadURL(url, { userAgent });

      if (waitSelector) {
        await this.waitForSelector(win, waitSelector, timeout);
      }

      const result = await win.webContents.executeJavaScript(`(${evalFunc.toString()})()`);
      
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
          if (document.querySelector('${selector}')) {
            clearTimeout(timer);
            resolve(true);
          } else {
            setTimeout(check, 50); 
          }
        };
        check();
      });
    `;
    await win.webContents.executeJavaScript(script);
  }
}

module.exports = new HeadlessBrowser();