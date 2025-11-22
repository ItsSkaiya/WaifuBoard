const { BrowserWindow, session } = require('electron');

class HeadlessBrowser {
  constructor() {
    this.win = null;
    this.currentConfig = null;
  }

  /**
   * Pre-loads the browser window on app startup.
   */
  async init() {
      console.log('[Headless] Pre-warming browser instance...');
      await this.getWindow(true); // Default to loading images
      console.log('[Headless] Browser ready.');
  }

  /**
   * Gets an existing window or creates a new one if config changes/window missing.
   */
  async getWindow(loadImages) {
    // If window exists and config matches, reuse it (FAST PATH)
    if (this.win && !this.win.isDestroyed() && this.currentConfig === loadImages) {
      return this.win;
    }

    // Otherwise, destroy old window and create new one (SLOW PATH)
    if (this.win && !this.win.isDestroyed()) {
      this.win.destroy();
    }

    this.currentConfig = loadImages;
    
    this.win = new BrowserWindow({
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
        autoplayPolicy: 'no-user-gesture-required',
        disableHtmlFullscreenWindowResize: true
      },
    });

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    this.win.webContents.setUserAgent(userAgent);

    const ses = this.win.webContents.session;
    
    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      const url = details.url.toLowerCase();
      const type = details.resourceType;

      if (
        type === 'font' || 
        type === 'stylesheet' || 
        type === 'media' || 
        type === 'websocket' ||
        type === 'manifest'
      ) {
        return callback({ cancel: true });
      }

      const blockList = [
        'google-analytics', 'doubleclick', 'facebook', 'twitter', 'adsystem', 
        'analytics', 'tracker', 'pixel', 'quantserve', 'newrelic'
      ];
      
      if (blockList.some(keyword => url.includes(keyword))) return callback({ cancel: true });
      
      if (!loadImages && (type === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/))) {
        return callback({ cancel: true });
      }

      return callback({ cancel: false });
    });

    // Load a blank page to keep the process alive and ready
    await this.win.loadURL('about:blank');

    return this.win;
  }

  async scrape(url, evalFunc, options = {}) {
    const { 
        waitSelector = null, 
        timeout = 10000, 
        args = [],
        scrollToBottom = false,
        renderWaitTime = 0, 
        loadImages = true 
    } = options; 

    try {
      const win = await this.getWindow(loadImages);

      await win.loadURL(url);

      if (waitSelector) {
        try {
            await this.waitForSelector(win, waitSelector, timeout);
        } catch (e) {
            console.warn(`[Headless] Timeout waiting for ${waitSelector}, proceeding...`);
        }
      }

      if (scrollToBottom) {
          await this.turboScroll(win);
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
      // Force recreation next time if something crashed
      if (this.win) {
          try { this.win.destroy(); } catch(e){}
          this.win = null;
      }
      throw error;
    }
  }

  async waitForSelector(win, selector, timeout) {
    const script = `
      new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (document.querySelector('${selector}')) {
            resolve(true);
          } else if (Date.now() - start > ${timeout}) {
            reject(new Error('Timeout'));
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    `;
    await win.webContents.executeJavaScript(script);
  }

  async turboScroll(win) {
    const script = `
        new Promise((resolve) => {
            let lastHeight = 0;
            let sameHeightCount = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollTo(0, scrollHeight);
                if (scrollHeight === lastHeight) {
                    sameHeightCount++;
                    if (sameHeightCount >= 5) {
                        clearInterval(timer);
                        resolve();
                    }
                } else {
                    sameHeightCount = 0;
                    lastHeight = scrollHeight;
                }
            }, 20); 
        });
    `;
    await win.webContents.executeJavaScript(script);
  }
}

module.exports = new HeadlessBrowser();