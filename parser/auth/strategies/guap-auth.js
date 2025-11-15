export class GuapAuthStrategy {
  static loginUrl = 'https://sso.guap.ru/realms/master/protocol/openid-connect/auth?state=8b484836b81aba3fd74d30292f4211b9&scope=profile%20email&response_type=code&approval_prompt=auto&redirect_uri=https%3A%2F%2Fpro.guap.ru%2Foauth%2Fcallback&client_id=prosuai';

  static async login(page, credentials) {

    try {
      await page.goto(this.loginUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });


      await page.waitForSelector('#username', { timeout: 15000 });

      await page.waitForSelector('#password-input', { timeout: 15000 });

      await page.type('#username', credentials.username);

      await page.type('#password-input', credentials.password);

      await page.waitForSelector('input[type="submit"]', { timeout: 10000 });


      const navigationPromise = page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      });

      await page.click('input[type="submit"]');

      let finalUrl;
      try {
        await navigationPromise;
        finalUrl = page.url();
      } catch (navError) {
        finalUrl = page.url();
        
        const errorText = await page.evaluate(() => {
          const errorElement = document.querySelector('.alert-error, .error, [class*="error"]');
          return errorElement ? errorElement.textContent.trim() : null;
        });
        
        if (errorText) {
          throw new Error(`Ошибка авторизации: ${errorText}`);
        }
      }

      const isSuccess = await this.detailedLoginCheck(page, finalUrl);
      
      if (isSuccess) {
        return finalUrl;
      } else {
        throw new Error('Не удалось подтвердить успешность авторизации');
      }

    } catch (error) {
      
      try {
        const pageContent = await page.content();
        const hasLoginForm = pageContent.includes('username') || pageContent.includes('password-input');
        const hasError = pageContent.includes('error') || pageContent.includes('invalid');
        
        if (hasError) {
          const visibleText = await page.evaluate(() => {
            return document.body.innerText.slice(0, 500);
          });
        }
      } catch (diagError) {
      }
      
      throw error;
    }
  }

  static async detailedLoginCheck(page, url) {
    
    const urlChecks = {
      isProGuap: url.includes('pro.guap.ru'),
      isCallback: url.includes('callback'),
      isSuccess: !url.includes('sso.guap.ru') && !url.includes('auth')
    };
    

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


      const isSuccessful = (
        (urlChecks.isProGuap || urlChecks.isCallback) &&
        !pageChecks.stillOnLoginPage &&
        (pageChecks.hasNavigation || pageChecks.hasUserInfo)
      );

      return isSuccessful;

    } catch (e) {
      return urlChecks.isProGuap || urlChecks.isCallback;
    }
  }

  static isLoginSuccessful(url) {
    const result = url.includes('pro.guap.ru') || url.includes('callback');
    return result;
  }
}