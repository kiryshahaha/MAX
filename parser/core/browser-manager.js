
import puppeteer from 'puppeteer';

export class BrowserManager {
  static async launch() {
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  static async createPage(browser) {
    const page = await browser.newPage();
    await page.setDefaultTimeout(15000);
    return page;
  }
}