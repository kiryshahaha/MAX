import { adminSupabase } from "../../lib/supabase-client";

export const logsService = {
  async logLogin(username, success, tasksCount = 0, errorMessage = null) {
    try {
      const { data, error } = await adminSupabase
        .from('login_logs')
        .insert({
          username: username,
          success: success,
          tasks_count: tasksCount,
          error_message: errorMessage
        })
        .select();

      if (error) throw error;
      
      console.log(`Логин записан для пользователя: ${username}`);
      return data;
    } catch (error) {
      console.error('Ошибка записи лога:', error);
    }
  }
};