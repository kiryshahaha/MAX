// session-manager.js
import puppeteer from 'puppeteer';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class SessionManager {
  static sessions = new Map();
  static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут

  // Создание новой сессии с авторизацией в ГУАП
  static async createSession(username, password) {
    let browser;
    try {
      // Закрываем старую сессию если есть
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
      
      // Устанавливаем таймауты
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      // Пытаемся залогиниться в ГУАП
      console.log(`🔐 Авторизация в ГУАП для пользователя: ${username}`);
      const finalUrl = await GuapAuthStrategy.login(page, { username, password });
      
      // Проверяем успешность авторизации
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
      
      console.log(`✅ Сессия создана для пользователя: ${username}`);
      return {
        success: true,
        sessionId: username
      };

    } catch (error) {
      console.error('Ошибка создания сессии:', error);
      
      // Закрываем браузер если он открылся
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

  // Получение существующей сессии
static getSession(username) {
  const session = this.sessions.get(username);
  
  if (!session) {
    return null;
  }
  
  // ПРОВЕРКА ВАЛИДНОСТИ ПЕРЕД ВОЗВРАТОМ
  if (!this.isSessionValid(session) || !this.validateSession(username)) {
    console.log(`🗑️ Удаление невалидной сессии: ${username}`);
    this.sessions.delete(username);
    return null;
  }
  
  this.updateActivity(username);
  return session;
}

  // Проверка валидности сессии
  static isSessionValid(session) {
    const now = Date.now();
    const isValid = (now - session.lastActivity) < this.SESSION_TIMEOUT;
    
    if (!isValid) {
      console.log(`⌛ Сессия истекла для пользователя: ${session.username}`);
    }
    return isValid;
  }

  // Проверка активности сессии (проверяет что страница еще жива)
  static async isSessionActive(username) {
    const session = this.sessions.get(username);
    
    if (!session || !this.isSessionValid(session)) {
      return false;
    }

    try {
      // Простая проверка - пытаемся перейти на главную страницу ЛК ГУАП
      await session.page.goto('https://pro.guap.ru/', { 
        waitUntil: 'networkidle2', 
        timeout: 10000 
      });
      
      // Если URL содержит pro.guap.ru - сессия активна
      const isActive = session.page.url().includes('pro.guap.ru');
      
      if (isActive) {
        this.updateActivity(username);
        return true;
      }
    } catch (e) {
      console.log(`❌ Сессия неактивна для ${username}:`, e.message);
    }

    // Если проверка не удалась - помечаем сессию как невалидную
    session.isValid = false;
    return false;
  }

  // Обновление времени активности
  static updateActivity(username) {
    const session = this.sessions.get(username);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  // Очистка устаревших сессий
  static async cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [username, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        console.log(`🧹 Очистка устаревшей сессии: ${username}`);
        try {
          await session.page.close();
          await session.browser.close();
        } catch (e) {
          console.error(`Ошибка при закрытии сессии ${username}:`, e);
        }
        this.sessions.delete(username);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`✅ Очищено ${cleanedCount} устаревших сессий`);
    }
  }

  // Принудительное закрытие всех сессий
  static async cleanupAllSessions() {
    console.log('🛑 Закрытие всех сессий...');
    
    for (const [username, session] of this.sessions.entries()) {
      try {
        await session.page.close();
        await session.browser.close();
      } catch (e) {
        console.error(`Ошибка при закрытии сессии ${username}:`, e);
      }
    }
    
    this.sessions.clear();
    console.log('✅ Все сессии закрыты');
  }

  // Получение статистики по сессиям
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
    console.log('🔍 СЕССИЯ: не найдена');
    return false;
  }

  console.log('🔍 ДЕБАГ СЕССИИ:', {
    username,
    createdAt: new Date(session.createdAt).toISOString(),
    lastActivity: new Date(session.lastActivity).toISOString(),
    age: Date.now() - session.createdAt,
    isValid: this.isSessionValid(session),
    pageUrl: session.page.url(),
    browserConnected: !session.browser.process()?.killed
  });

  try {
    // Проверяем что страница жива
    const currentUrl = session.page.url();
    console.log('   - Текущий URL страницы:', currentUrl);
    
    // Проверяем наличие элементов ЛК ГУАП
    const hasGuapElements = await session.page.evaluate(() => {
      return {
        hasNavigation: !!document.querySelector('[class*="navigation"]'),
        hasUserMenu: !!document.querySelector('[class*="user"]'),
        hasSchedule: !!document.querySelector('[href*="schedule"]'),
        bodyText: document.body.innerText.slice(0, 200)
      };
    });
    
    console.log('   - Элементы ЛК:', hasGuapElements);
    return true;
    
  } catch (error) {
    console.log('   - Ошибка проверки сессии:', error.message);
    return false;
  }
}
static async validateSession(username) {
  const session = this.sessions.get(username);
  if (!session) return false;
  
  try {
    // Проверяем, что страница жива и доступна
    if (session.page.isClosed()) {
      console.log(`❌ Страница закрыта для пользователя: ${username}`);
      return false;
    }
    
    // Простая проверка доступности DOM
    await session.page.evaluate(() => {
      if (!document || !document.body) {
        throw new Error('DOM not available');
      }
    });
    
    return true;
  } catch (error) {
    console.log(`❌ Сессия невалидна для ${username}:`, error.message);
    return false;
  }
}

}