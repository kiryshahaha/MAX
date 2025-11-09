import { adminSupabase } from "../../lib/supabase-client";

export const scheduleService = {
  async saveUserSchedule(userId, schedule, year, week) {
    try {
      console.log('💾 Начинаем сохранение расписания для пользователя:', userId);
      console.log('📅 Параметры расписания:', { year, week });
      
      const scheduleData = {
        schedule: schedule,
        schedule_year: year,
        schedule_week: week,
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Проверяем существующую запись...');
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, schedule, schedule_year, schedule_week')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Ошибка при проверке существующей записи:', selectError);
        throw selectError;
      }

      console.log('📊 Существующая запись:', existingData ? 'найдена' : 'не найдена');

      let result;
      
      if (existingData) {
        console.log('🔄 Обновляем существующую запись (расписание)...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(scheduleData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления расписания:', error);
          throw error;
        }
        result = data;
        console.log('✅ Расписание обновлено для пользователя', userId);
      } else {
        console.log('🆕 Создаем новую запись с расписанием...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...scheduleData
          })
          .select();

        if (error) {
          console.error('❌ Ошибка создания записи с расписанием:', error);
          throw error;
        }
        result = data;
        console.log('✅ Создана запись с расписанием для пользователя', userId);
      }

      console.log('💾 Результат сохранения расписания:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка сохранения расписания:', error);
      throw error;
    }
  }
};