// /api/utils/retry-handler.js
export class RetryHandler {
  static async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Попытка ${attempt}/${maxRetries} выполнения запроса к парсеру`);
        const result = await operation();
        console.log(`✅ Попытка ${attempt} успешна`);
        return result;
      } catch (error) {
        lastError = error;
        console.log(`❌ Попытка ${attempt}/${maxRetries} не удалась:`, error.message);
        
        // Проверяем, стоит ли повторять для этой ошибки
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const nextDelay = delay * attempt; // Прогрессивная задержка
          console.log(`⏳ Ожидание ${nextDelay}ms перед повторной попыткой...`);
          await new Promise(resolve => setTimeout(resolve, nextDelay));
        } else if (attempt >= maxRetries) {
          console.log(`💥 Все ${maxRetries} попыток не удались`);
        } else {
          console.log(`🚫 Ошибка не требует повторной попытки:`, error.message);
          break;
        }
      }
    }
    
    throw lastError;
  }
  
  static shouldRetry(error) {
    const retryableErrors = [
      'ERR_ABORTED',
      'detached',
      'closed',
      'timeout',
      'network',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'fetch failed',
      'Failed to fetch',
      'Navigation timeout',
      'Waiting for selector',
      'LifecycleWatcher disposed',
      'Navigating frame was detached'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorCode.includes(retryableError.toLowerCase())
    );
  }
  
  // Специальный метод для операций парсера с инвалидацией сессии
  static async withParserRetry(operation, maxRetries = 2, delay = 2000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔧 Попытка ${attempt}/${maxRetries} выполнения запроса парсера`);
        const result = await operation();
        
        // Проверяем успешность результата парсера
        if (result && result.success !== false) {
          console.log(`✅ Парсер попытка ${attempt} успешна`);
          return result;
        } else {
          throw new Error(result?.message || 'Парсер вернул неудачный результат');
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Парсер попытка ${attempt}/${maxRetries} не удалась:`, error.message);
        
        // Для ошибок авторизации инвалидируем сессию и пробуем снова
        if (this.isAuthError(error) && attempt < maxRetries) {
          console.log('🔐 Ошибка авторизации, инвалидируем сессию...');
          try {
            await this.invalidateSession();
          } catch (invalidateError) {
            console.log('⚠️ Не удалось инвалидировать сессию:', invalidateError.message);
          }
        }
        
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const nextDelay = delay * attempt;
          console.log(`⏳ Ожидание ${nextDelay}ms перед повторной попыткой парсера...`);
          await new Promise(resolve => setTimeout(resolve, nextDelay));
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }
  
  static isAuthError(error) {
    const authErrors = [
      'Waiting for selector `#username`',
      'TimeoutError',
      'неверный логин',
      'invalid credentials',
      'authorization failed',
      'аутентификация'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return authErrors.some(authError => 
      errorMessage.includes(authError.toLowerCase())
    );
  }
  
  static async invalidateSession() {
    try {
      // Инвалидируем сессию парсера
      const parserServiceUrl = process.env.PARSER_SERVICE_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${parserServiceUrl}/api/scrape/invalidate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        console.log('✅ Сессия парсера инвалидирована');
      }
    } catch (error) {
      console.log('⚠️ Ошибка при инвалидации сессии:', error.message);
    }
  }
}