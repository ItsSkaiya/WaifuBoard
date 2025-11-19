const { BrowserWindow } = require('electron');

class HeadlessBrowser {
  async scrape(url, evalFunc, options = {}) {
    const { waitSelector = null, timeout = 15000 } = options;

    const win = new BrowserWindow({
      show: false, 
      width: 800,
      height: 600,
      webPreferences: {
        offscreen: true,  
        contextIsolation: false,  
        nodeIntegration: false,
        images: true,  
        webgl: false,   
      },
    });

    try {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      win.webContents.setUserAgent(userAgent);

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
            // FIX: Use setTimeout because requestAnimationFrame stops in hidden windows
            setTimeout(check, 100); 
          }
        };
        check();
      });
    `;
    await win.webContents.executeJavaScript(script);
  }
}

module.exports = new HeadlessBrowser();