import { getAdminSupabase } from "../../lib/supabase-client";

export const tasksService = {
   async saveUserTasks(userId, tasks) {
    try {
      const adminSupabase = getAdminSupabase();

      const tasksData = {
        tasks: tasks,
        tasks_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id') 
        .eq('user_id', userId)
        .single();

      let result;

      if (existingData) {
        
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(tasksData)
          .eq('user_id', userId)
          .select('tasks, tasks_updated_at, updated_at');

        if (error) {
          throw error;
        }
        result = data;
      } else {
        
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...tasksData
          })
          .select('tasks, tasks_updated_at, updated_at'); 

        if (error) {
          throw error;
        }
        result = data;
      }

      return result;
      
    } catch (error) {
      throw error;
    }
  }
};