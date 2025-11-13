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
    console.log('✅ Креденшилы валидны');
  }

  async getAuthenticatedPage(credentials) {
    console.log('🔄 ПОЛУЧЕНИЕ АУТЕНТИФИЦИРОВАННОЙ СТРАНИЦЫ...');
    const userId = this.getUserId(credentials);

    console.log('🔍 Поиск сессии для:', userId);
    let session = this.sessionManager.getSession(userId);

    if (!session) {
      console.log('🆕 Сессия не найдена, создаем новую через SessionManager...');
      const result = await this.sessionManager.createSession(credentials.username, credentials.password);

      if (!result.success) {
        console.error('❌ Ошибка создания сессии:', result.message);
        throw new Error(`Не удалось создать сессию: ${result.message}`);
      }

      session = this.sessionManager.getSession(userId);
      console.log('✅ Новая сессия создана');
    } else {
      console.log('✅ Используем существующую сессию');
    }

    // ПРОВЕРКА СОСТОЯНИЯ СТРАНИЦЫ ПЕРЕД ИСПОЛЬЗОВАНИЕМ
    try {
      await this.validatePageState(session.page);
    } catch (error) {
      console.log('🔄 Страница невалидна, пересоздаем сессию...');
      await this.invalidateSession(credentials);
      return await this.getAuthenticatedPage(credentials); // Рекурсивный вызов
    }

    // Проверяем, аутентифицирована ли уже сессия
    console.log('🔐 ПРОВЕРКА СТАТУСА АВТОРИЗАЦИИ...');
    const isLoggedIn = await this.isLoggedIn(session.page);
    console.log('   - Статус авторизации:', isLoggedIn ? 'ВХОД ВЫПОЛНЕН' : 'ТРЕБУЕТСЯ ВХОД');

    if (!isLoggedIn) {
      console.log('🔐 ВЫПОЛНЕНИЕ ПРОЦЕДУРЫ ВХОДА...');
      await this.performLogin(session.page, credentials);

      // Повторная проверка после логина
      const stillLoggedIn = await this.isLoggedIn(session.page);
      console.log('   - Статус после логина:', stillLoggedIn ? 'УСПЕХ' : 'НЕУДАЧА');

      if (!stillLoggedIn) {
        throw new Error('Не удалось подтвердить авторизацию после входа');
      }
    }

    this.sessionManager.updateActivity(userId);
    console.log('✅ СТРАНИЦА ГОТОВА К ИСПОЛЬЗОВАНИЮ');
    return session.page;
  }

  async isLoggedIn(page) {
    try {
      console.log('🔐 Проверка авторизации...');
      await page.goto('https://pro.guap.ru/inside/profile', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });

      const isLoggedIn = !page.url().includes('sso.guap.ru');
      console.log('   - Результат проверки:', isLoggedIn ? 'АВТОРИЗИРОВАН' : 'НЕ АВТОРИЗИРОВАН');
      console.log('   - Текущий URL:', page.url());

      return isLoggedIn;
    } catch (error) {
      console.log('   - Ошибка проверки авторизации:', error.message);
      return false;
    }
  }

  async performLogin(page, credentials) {
    console.log('🔐 ВЫПОЛНЕНИЕ ЛОГИНА...');
    const finalUrl = await this.authStrategy.login(page, credentials);

    if (!this.authStrategy.isLoginSuccessful(finalUrl)) {
      console.error('❌ Логин не удался. Финальный URL:', finalUrl);

      const errorText = await page.evaluate(() => {
        const errorElement = document.querySelector('.alert-error, .error, [class*="error"]');
        return errorElement ? errorElement.textContent.trim() : null;
      });

      if (errorText) {
        console.error('❌ Текст ошибки:', errorText);
        throw new Error(errorText);
      }
      throw new Error('Неверный логин или пароль');
    }

    console.log('✅ Логин выполнен успешно');
  }

  getUserId(credentials) {
    return credentials.username;
  }

  async invalidateSession(credentials) {
    console.log('🗑️ ИНВАЛИДАЦИЯ СЕССИИ...');
    const userId = this.getUserId(credentials);
    const session = this.sessionManager.sessions.get(userId);

    if (session) {
      try {
        await session.page.close();
        // НЕ закрываем browser здесь - это делает SessionManager
        this.sessionManager.sessions.delete(userId);
        console.log('✅ Сессия инвалидирована');
      } catch (error) {
        console.error('❌ Ошибка инвалидации сессии:', error);
      }
    } else {
      console.log('ℹ️ Сессия не найдена для инвалидации');
    }
  }

  async validatePageState(page) {
    try {
      // Проверяем, что страница не закрыта и не detached
      if (page.isClosed()) {
        throw new Error('Page is closed');
      }

      // Простая проверка доступности страницы
      await page.evaluate(() => {
        if (!document || !document.body) {
          throw new Error('Page document not available');
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Page state validation failed:', error.message);
      throw error;
    }
  }

  async isLoggedIn(page) {
  try {
    console.log('🔐 Проверка авторизации...');
    
    // ПРОВЕРКА СОСТОЯНИЯ СТРАНИЦЫ ПЕРЕД НАВИГАЦИЕЙ
    await this.validatePageState(page);
    
    await page.goto('https://pro.guap.ru/inside/profile', {
      waitUntil: 'domcontentloaded', // ИЗМЕНИТЬ НА domcontentloaded
      timeout: 15000
    });
    
    const isLoggedIn = !page.url().includes('sso.guap.ru');
    console.log('   - Результат проверки:', isLoggedIn ? 'АВТОРИЗИРОВАН' : 'НЕ АВТОРИЗИРОВАН');
    console.log('   - Текущий URL:', page.url());
    
    return isLoggedIn;
  } catch (error) {
    console.log('   - Ошибка проверки авторизации:', error.message);
    
    // Если ошибка связана с состоянием страницы - пробрасываем выше
    if (error.message.includes('detached') || error.message.includes('closed')) {
      throw error;
    }
    
    return false;
  }
}

}