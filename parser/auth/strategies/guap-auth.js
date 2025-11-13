//MAX/parser/auth/strategies/guap-auth.js

export class GuapAuthStrategy {
  static loginUrl = 'https://sso.guap.ru/realms/master/protocol/openid-connect/auth?state=8b484836b81aba3fd74d30292f4211b9&scope=profile%20email&response_type=code&approval_prompt=auto&redirect_uri=https%3A%2F%2Fpro.guap.ru%2Foauth%2Fcallback&client_id=prosuai';

  static async login(page, credentials) {
    console.log('🔐 НАЧАЛО АВТОРИЗАЦИИ В ГУАП');
    console.log('📝 Данные:', { 
      username: credentials.username, 
      passwordLength: credentials.password?.length || 0 
    });

    try {
      // Логируем переход на страницу авторизации
      console.log('🚀 Переход на страницу авторизации...');
      await page.goto(this.loginUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      console.log('✅ Страница загружена. URL:', page.url());

      // Ждем и логируем появление полей
      console.log('⏳ Ожидание поля username...');
      await page.waitForSelector('#username', { timeout: 15000 });
      console.log('✅ Поле username найдено');

      console.log('⏳ Ожидание поля password...');
      await page.waitForSelector('#password-input', { timeout: 15000 });
      console.log('✅ Поле password найдено');

      // Заполняем поля с логированием
      console.log('⌨️ Заполнение логина...');
      await page.type('#username', credentials.username);
      console.log('✅ Логин заполнен');

      console.log('⌨️ Заполнение пароля...');
      await page.type('#password-input', credentials.password);
      console.log('✅ Пароль заполнен');

      // Проверяем наличие кнопки
      console.log('⏳ Поиск кнопки входа...');
      await page.waitForSelector('input[type="submit"]', { timeout: 10000 });
      console.log('✅ Кнопка входа найдена');

      // Логируем перед кликом
      console.log('🖱️ Нажатие кнопки входа...');

      // Создаем промис навигации ДО клика
      const navigationPromise = page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      });

      await page.click('input[type="submit"]');
      console.log('✅ Кнопка нажата, ожидание навигации...');

      let finalUrl;
      try {
        await navigationPromise;
        finalUrl = page.url();
        console.log('✅ Навигация завершена. Финальный URL:', finalUrl);
      } catch (navError) {
        console.log('⚠️ Навигация не завершилась в ожидаемое время, проверяем текущий URL...');
        finalUrl = page.url();
        console.log('📌 Текущий URL после таймаута:', finalUrl);
        
        // Проверяем, не появилась ли ошибка авторизации
        const errorText = await page.evaluate(() => {
          const errorElement = document.querySelector('.alert-error, .error, [class*="error"]');
          return errorElement ? errorElement.textContent.trim() : null;
        });
        
        if (errorText) {
          console.log('❌ Ошибка на странице:', errorText);
          throw new Error(`Ошибка авторизации: ${errorText}`);
        }
      }

      // Детальная проверка успешности авторизации
      const isSuccess = await this.detailedLoginCheck(page, finalUrl);
      
      if (isSuccess) {
        console.log('🎉 АВТОРИЗАЦИЯ УСПЕШНА!');
        return finalUrl;
      } else {
        console.log('❌ АВТОРИЗАЦИЯ НЕ УДАЛАСЬ');
        throw new Error('Не удалось подтвердить успешность авторизации');
      }

    } catch (error) {
      console.error('💥 КРИТИЧЕСКАЯ ОШИБКА АВТОРИЗАЦИИ:', error.message);
      
      // Дополнительная диагностика
      try {
        const pageContent = await page.content();
        const hasLoginForm = pageContent.includes('username') || pageContent.includes('password-input');
        const hasError = pageContent.includes('error') || pageContent.includes('invalid');
        
        console.log('🔍 ДИАГНОСТИКА СТРАНИЦЫ:');
        console.log('   - Есть форма логина:', hasLoginForm);
        console.log('   - Есть сообщения об ошибках:', hasError);
        console.log('   - Текущий URL:', page.url());
        
        if (hasError) {
          const visibleText = await page.evaluate(() => {
            return document.body.innerText.slice(0, 500);
          });
          console.log('   - Текст страницы:', visibleText);
        }
      } catch (diagError) {
        console.log('   - Диагностика не удалась:', diagError.message);
      }
      
      throw error;
    }
  }

  static async detailedLoginCheck(page, url) {
    console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА АВТОРИЗАЦИИ...');
    console.log('   - URL:', url);
    
    // Проверяем URL
    const urlChecks = {
      isProGuap: url.includes('pro.guap.ru'),
      isCallback: url.includes('callback'),
      isSuccess: !url.includes('sso.guap.ru') && !url.includes('auth')
    };
    
    console.log('   - Проверки URL:', urlChecks);

    // Проверяем содержимое страницы
    try {
      const pageChecks = await page.evaluate(() => {
        const hasNavigation = !!document.querySelector('[class*="navigation"], [class*="menu"], nav');
        const hasUserInfo = !!document.querySelector('[class*="user"], [class*="profile"], .username');
        const hasLogout = !!document.querySelector('[href*="logout"], [onclick*="logout"]');
        const stillOnLoginPage = !!document.querySelector('#username, #password-input');
        
        return {
          hasNavigation,
          hasUserInfo,
          hasLogout,
          stillOnLoginPage,
          title: document.title,
          bodyClass: document.body.className
        };
      });

      console.log('   - Проверки страницы:', pageChecks);

      // Логика определения успешности
      const isSuccessful = (
        (urlChecks.isProGuap || urlChecks.isCallback) &&
        !pageChecks.stillOnLoginPage &&
        (pageChecks.hasNavigation || pageChecks.hasUserInfo)
      );

      console.log('   - Итоговый результат авторизации:', isSuccessful);
      return isSuccessful;

    } catch (e) {
      console.log('   - Ошибка проверки страницы:', e.message);
      // Если не можем проверить страницу, доверяем URL
      return urlChecks.isProGuap || urlChecks.isCallback;
    }
  }

  static isLoginSuccessful(url) {
    const result = url.includes('pro.guap.ru') || url.includes('callback');
    console.log('📋 Базовая проверка успешности по URL:', { url, result });
    return result;
  }
}