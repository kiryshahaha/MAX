// session-manager.js
import puppeteer from 'puppeteer';

export class SessionManager {
  static sessions = new Map();
  static browser = null;

  static async getSession(userId) {
    let session = this.sessions.get(userId);
    
    if (!session || this.isSessionExpired(session)) {
      session = await this.createSession(userId);
      this.sessions.set(userId, session);
    }
    
    return session;
  }

  static async createSession(userId) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    await page.setDefaultTimeout(15000);
    
    const session = {
      page,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isValid: true
    };
    
    return session;
  }

  static isSessionExpired(session) {
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут
    return (Date.now() - session.lastActivity) > SESSION_TIMEOUT;
  }

  static async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  static updateActivity(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  static async cleanupExpiredSessions() {
    for (const [userId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        await session.page.close();
        this.sessions.delete(userId);
      }
    }
  }

  // Graceful shutdown
  static async cleanupAllSessions() {
    for (const [userId, session] of this.sessions) {
      await session.page.close();
    }
    this.sessions.clear();
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}