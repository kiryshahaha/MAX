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

      const logDataWithCount = {
        ...logData,
        items_count: count
      };

      const { error } = await adminSupabase
        .from('login_logs')
        .insert(logDataWithCount);

      if (error) {
        const { error: retryError } = await adminSupabase
          .from('login_logs')
          .insert(logData);
        
        if (retryError) {
        } else {
        }
      } else {
      }
    } catch (error) {
    }
  }
};