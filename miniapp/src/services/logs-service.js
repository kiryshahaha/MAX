import { getAdminSupabase } from "../../lib/supabase-client";

export const logsService = {
  async logLogin(username, success, count = 0, errorMessage = '', type = 'tasks') {
    try {

       const adminSupabase = getAdminSupabase();

      const logData = {
        username,
        success,
        error_message: errorMessage,
        type: type,
        created_at: new Date().toISOString()
      };

      // Пробуем добавить items_count, но если будет ошибка - уберем его
      const logDataWithCount = {
        ...logData,
        items_count: count
      };

      const { error } = await adminSupabase
        .from('login_logs')
        .insert(logDataWithCount);

      if (error) {
        console.log('Пробуем записать лог без items_count:', error.message);
        // Пробуем без items_count
        const { error: retryError } = await adminSupabase
          .from('login_logs')
          .insert(logData);
        
        if (retryError) {
          console.error('Ошибка записи лога:', retryError);
        } else {
          console.log(`📝 Логин записан (без items_count): ${username}, успех: ${success}, тип: ${type}`);
        }
      } else {
        console.log(`📝 Логин записан: ${username}, успех: ${success}, тип: ${type}, кол-во: ${count}`);
      }
    } catch (error) {
      console.error('Log service error:', error);
    }
  }
};