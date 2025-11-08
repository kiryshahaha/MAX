import { adminSupabase } from "../../lib/supabase-client";

export const tasksService = {
  async saveUserTasks(userId, tasks) {
    try {
      const tasksData = {
        tasks: tasks,
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
          .select();

        if (error) throw error;
        result = data;
        console.log(`Обновлены задачи для пользователя ${userId}`);
      } else {
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...tasksData
          })
          .select();

        if (error) throw error;
        result = data;
        console.log(`Создана запись с задачами для пользователя ${userId}`);
      }

      return result;
      
    } catch (error) {
      console.error('Ошибка сохранения задач:', error);
      throw error;
    }
  }
};