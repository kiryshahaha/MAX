// base-scraper.js
import { SessionManager } from '../core/session-manager.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class BaseScraper {
  constructor() {
    this.sessionManager = SessionManager;
    this.authStrategy = GuapAuthStrategy;
  }

  async validateCredentials(credentials) {
    if (!credentials.username || !credentials.password) {
      throw new Error('⛔ Укажите логин и пароль');
    }
  }

  async getAuthenticatedPage(credentials) {
    const userId = this.getUserId(credentials);
    let session = await this.sessionManager.getSession(userId);
    
    // Проверяем, аутентифицирована ли уже сессия
    if (!await this.isLoggedIn(session.page)) {
      await this.performLogin(session.page, credentials);
    }
    
    this.sessionManager.updateActivity(userId);
    return session.page;
  }

  async isLoggedIn(page) {
    try {
      await page.goto('https://pro.guap.ru/inside/profile', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      
      return !page.url().includes('sso.guap.ru');
    } catch (error) {
      return false;
    }
  }

  async performLogin(page, credentials) {
    const finalUrl = await this.authStrategy.login(page, credentials);
    
    if (!this.authStrategy.isLoginSuccessful(finalUrl)) {
      const errorText = await page.evaluate(() => {
        const errorElement = document.querySelector('.alert-error');
        return errorElement ? errorElement.textContent.trim() : null;
      });
      
      if (errorText) {
        throw new Error(errorText);
      }
      throw new Error('Неверный логин или пароль');
    }
  }

  getUserId(credentials) {
    return credentials.username;
  }

  async invalidateSession(credentials) {
    const userId = this.getUserId(credentials);
    const session = this.sessionManager.sessions.get(userId);
    if (session) {
      await session.page.close();
      this.sessionManager.sessions.delete(userId);
    }
  }
}