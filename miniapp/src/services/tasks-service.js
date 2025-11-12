// services/tasks-service.js
import { getAdminSupabase } from "../../lib/supabase-client";

export const tasksService = {
  async saveUserTasks(userId, tasks) {
    try {
      const adminSupabase = getAdminSupabase();

      console.log('💾 Сохраняем задачи в БД для пользователя:', userId);
      console.log('📊 Количество задач для сохранения:', tasks?.length || 0);

      const tasksData = {
        tasks: tasks,
        tasks_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Проверяем существующую запись
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, tasks')
        .eq('user_id', userId)
        .single();

      let result;

      if (existingData) {
        console.log('🔄 Обновляем существующую запись задач');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(tasksData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления задач:', error);
          throw error;
        }
        result = data;
        console.log(`✅ Задачи обновлены для пользователя ${userId}`);
      } else {
        console.log('🆕 Создаем новую запись с задачами');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...tasksData
          })
          .select();

        if (error) {
          console.error('❌ Ошибка создания записи задач:', error);
          throw error;
        }
        result = data;
        console.log(`✅ Создана запись с задачами для пользователя ${userId}`);
      }

      console.log('💾 Успешно сохранено задач в БД:', result?.length || 0);
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка сохранения задач в БД:', error);
      throw error;
    }
  }
};