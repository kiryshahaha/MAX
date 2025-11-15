import puppeteer from 'puppeteer';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class SessionManager {
  static sessions = new Map();
  static SESSION_TIMEOUT = 30 * 60 * 1000; 

  static async createSession(username, password) {
    let browser;
    try {
      const existingSession = this.sessions.get(username);
      if (existingSession) {
        await existingSession.page.close();
        this.sessions.delete(username);
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      const finalUrl = await GuapAuthStrategy.login(page, { username, password });
      
      if (!GuapAuthStrategy.isLoginSuccessful(finalUrl)) {
        await browser.close();
        return {
          success: false,
          message: '❌ Неверный логин или пароль ЛК ГУАП'
        };
      }

      const session = {
        page,
        browser,
        username,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        isValid: true
      };

      this.sessions.set(username, session);
      
      return {
        success: true,
        sessionId: username
      };

    } catch (error) {
      
      if (browser) {
        await browser.close();
      }
      
      let errorMessage = '❌ Ошибка входа в ЛК ГУАП';
      if (error.message.includes('net::ERR_ABORTED')) {
        errorMessage = '❌ Проблема с подключением к серверу ГУАП';
      } else if (error.message.includes('Timeout')) {
        errorMessage = '❌ Превышено время ожидания ответа от ГУАП';
      }
      
      return {
        success: false,
        message: `${errorMessage}: ${error.message}`
      };
    }
  }

static getSession(username) {
  const session = this.sessions.get(username);
  
  if (!session) {
    return null;
  }
  
  if (!this.isSessionValid(session) || !this.validateSession(username)) {
    this.sessions.delete(username);
    return null;
  }
  
  this.updateActivity(username);
  return session;
}

  static isSessionValid(session) {
    const now = Date.now();
    const isValid = (now - session.lastActivity) < this.SESSION_TIMEOUT;
    
    if (!isValid) {
    }
    return isValid;
  }

  static async isSessionActive(username) {
    const session = this.sessions.get(username);
    
    if (!session || !this.isSessionValid(session)) {
      return false;
    }

    try {
      await session.page.goto('https://pro.guap.ru/', { 
        waitUntil: 'networkidle2', 
        timeout: 10000 
      });
      
      const isActive = session.page.url().includes('pro.guap.ru');
      
      if (isActive) {
        this.updateActivity(username);
        return true;
      }
    } catch (e) {
    }

    session.isValid = false;
    return false;
  }

  static updateActivity(username) {
    const session = this.sessions.get(username);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  static async cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [username, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        try {
          await session.page.close();
          await session.browser.close();
        } catch (e) {
        }
        this.sessions.delete(username);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
    }
  }

  static async cleanupAllSessions() {
    
    for (const [username, session] of this.sessions.entries()) {
      try {
        await session.page.close();
        await session.browser.close();
      } catch (e) {
      }
    }
    
    this.sessions.clear();
  }

  static getSessionStats() {
    const activeSessions = Array.from(this.sessions.values()).filter(session => 
      this.isSessionValid(session)
    ).length;

    return {
      total: this.sessions.size,
      active: activeSessions,
      expired: this.sessions.size - activeSessions
    };
  }

  static async debugSession(username) {
  const session = this.sessions.get(username);
  if (!session) {
    return false;
  }


  try {
    const currentUrl = session.page.url();
    
    const hasGuapElements = await session.page.evaluate(() => {
      return {
        hasNavigation: !!document.querySelector('[class*="navigation"]'),
        hasUserMenu: !!document.querySelector('[class*="user"]'),
        hasSchedule: !!document.querySelector('[href*="schedule"]'),
        bodyText: document.body.innerText.slice(0, 200)
      };
    });
    
    return true;
    
  } catch (error) {
    return false;
  }
}
static async validateSession(username) {
  const session = this.sessions.get(username);
  if (!session) return false;
  
  try {
    if (session.page.isClosed()) {
      return false;
    }
    
    await session.page.evaluate(() => {
      if (!document || !document.body) {
        throw new Error('DOM not available');
      }
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

}