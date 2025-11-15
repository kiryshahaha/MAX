export class RetryHandler {
  static async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const nextDelay = delay * attempt; 
          await new Promise(resolve => setTimeout(resolve, nextDelay));
        } else if (attempt >= maxRetries) {
        } else {
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
  
  static async withParserRetry(operation, maxRetries = 2, delay = 2000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (result && result.success !== false) {
          return result;
        } else {
          throw new Error(result?.message || 'Парсер вернул неудачный результат');
        }
      } catch (error) {
        lastError = error;
        
        if (this.isAuthError(error) && attempt < maxRetries) {
          try {
            await this.invalidateSession();
          } catch (invalidateError) {
          }
        }
        
        if (attempt < maxRetries && this.shouldRetry(error)) {
          const nextDelay = delay * attempt;
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
      const parserServiceUrl = process.env.PARSER_SERVICE_URL;
      const response = await fetch(`${parserServiceUrl}/api/scrape/invalidate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
      }
    } catch (error) {
    }
  }
}