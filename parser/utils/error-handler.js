//MAX/parser/utils/error-handler.js

export class ErrorHandler {
  static handleScrapingError(error) {
    console.error('Ошибка скрапинга:', error);
    
    if (error.message.includes('Неверный логин или пароль')) {
      return {
        message: '❌ Неверный логин или пароль',
        status: 401
      };
    }
    
    if (error.message.includes('Укажите логин и пароль')) {
      return {
        message: error.message,
        status: 400
      };
    }
    
    // Обработка сетевых ошибок
    if (error.message.includes('ERR_ABORTED') || error.message.includes('detached')) {
      return {
        message: '⚠️ Проблема с подключением к серверу ГУАП. Попробуйте позже.',
        status: 503,
        retryable: true
      };
    }
    
    // Обработка таймаутов
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return {
        message: '⚠️ Превышено время ожидания ответа от сервера ГУАП.',
        status: 504,
        retryable: true
      };
    }
    
    return {
      message: '⚠️ Ошибка при выполнении скрипта: ' + error.message,
      status: 500
    };
  }
}