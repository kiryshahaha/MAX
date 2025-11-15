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

    let session = this.sessionManager.getSession(userId);

    if (!session) {
      const result = await this.sessionManager.createSession(credentials.username, credentials.password);

      if (!result.success) {
        throw new Error(`Не удалось создать сессию: ${result.message}`);
      }

      session = this.sessionManager.getSession(userId);
    } else {
    }

    try {
      await this.validatePageState(session.page);
    } catch (error) {
      await this.invalidateSession(credentials);
      return await this.getAuthenticatedPage(credentials); 
    }

    const isLoggedIn = await this.isLoggedIn(session.page);

    if (!isLoggedIn) {
      await this.performLogin(session.page, credentials);

      const stillLoggedIn = await this.isLoggedIn(session.page);

      if (!stillLoggedIn) {
        throw new Error('Не удалось подтвердить авторизацию после входа');
      }
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

      const isLoggedIn = !page.url().includes('sso.guap.ru');

      return isLoggedIn;
    } catch (error) {
      return false;
    }
  }

  async performLogin(page, credentials) {
    const finalUrl = await this.authStrategy.login(page, credentials);

    if (!this.authStrategy.isLoginSuccessful(finalUrl)) {

      const errorText = await page.evaluate(() => {
        const errorElement = document.querySelector('.alert-error, .error, [class*="error"]');
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
      try {
        await session.page.close();
        this.sessionManager.sessions.delete(userId);
      } catch (error) {
      }
    } else {
    }
  }

  async validatePageState(page) {
    try {
      if (page.isClosed()) {
        throw new Error('Page is closed');
      }

      await page.evaluate(() => {
        if (!document || !document.body) {
          throw new Error('Page document not available');
        }
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async isLoggedIn(page) {
  try {
    await this.validatePageState(page);
    
    await page.goto('https://pro.guap.ru/inside/profile', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    const isLoggedIn = !page.url().includes('sso.guap.ru');
    
    return isLoggedIn;
  } catch (error) {
    
    if (error.message.includes('detached') || error.message.includes('closed')) {
      throw error;
    }
    
    return false;
  }
}

}