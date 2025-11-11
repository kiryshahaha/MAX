// services/schedule-service.js
import { adminSupabase } from "../../lib/supabase-client";

export const scheduleService = {
  async saveUserSchedule(userId, scheduleData, scheduleType, dateParams = null, shouldSave = false) {
    try {
      console.log('💾 Начинаем сохранение расписания для пользователя:', userId);
      console.log('📅 Тип расписания:', scheduleType);
      console.log('💾 Сохранять в БД:', shouldSave);
      
      // Если не нужно сохранять в БД, просто возвращаем результат
      if (!shouldSave) {
        console.log('📋 Расписание не сохраняется в БД (пользователь не выбрал сохранение)');
        return { savedToDatabase: false, message: 'Расписание не требует сохранения в БД' };
      }

      const currentDate = new Date();
      const updateData = {
        schedule_updated_at: currentDate.toISOString()
      };

      // Для недельного расписания
      if (scheduleType === 'week') {
        const currentWeek = this.getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();
        
        console.log('✅ Сохраняем расписание для текущей недели:', currentWeek);
        
        updateData.week_schedule = scheduleData;
        // Не сохраняем week_number и week_year - используем системные даты

      } else if (scheduleType === 'today') {
        const todayString = currentDate.toISOString().split('T')[0];
        
        console.log('✅ Сохраняем расписание на сегодня:', todayString);
        
        updateData.today_schedule = scheduleData;
        // Не сохраняем today_date - используем системную дату
      }
      
      console.log('🔍 Проверяем существующую запись...');
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Ошибка при проверке существующей записи:', selectError);
        throw selectError;
      }

      console.log('📊 Существующая запись:', existingData ? 'найдена' : 'не найдена');

      let result;
      
      if (existingData) {
        console.log('🔄 Обновляем расписание...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(updateData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления расписания:', error);
          throw error;
        }
        result = data;
        console.log('✅ Расписание обновлено для пользователя', userId);
      } else {
        console.log('🆕 Создаем новую запись...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...updateData
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
      return { savedToDatabase: true, data: result };
      
    } catch (error) {
      console.error('❌ Ошибка сохранения расписания:', error);
      throw error;
    }
  },

  async getUserSchedule(userId, scheduleType) {
    try {
      let selectField;
      
      if (scheduleType === 'today') {
        selectField = 'today_schedule';
      } else if (scheduleType === 'week') {
        selectField = 'week_schedule';
      } else {
        throw new Error('Неверный тип расписания');
      }

      const { data, error } = await adminSupabase
        .from('user_data')
        .select(selectField)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Ошибка получения расписания из БД:', error);
        throw error;
      }

      if (data) {
        console.log('📋 Расписание получено из БД');
        return data;
      }
      
      // Если в БД нет данных
      console.log('📋 Расписание не найдено в БД');
      return null;
      
    } catch (error) {
      console.error('❌ Ошибка получения расписания:', error);
      throw error;
    }
  },

  // Проверка актуальности расписания
  isScheduleActual(scheduleType, scheduleData = null) {
    const currentDate = new Date();
    
    if (scheduleType === 'today') {
      // Для расписания на день проверяем, что оно вообще есть
      return scheduleData && scheduleData.today_schedule;
    } else if (scheduleType === 'week') {
      // Для недельного расписания проверяем, что оно есть
      return scheduleData && scheduleData.week_schedule;
    }
    
    return false;
  },

  // Очистка устаревших расписаний - УПРОЩЕННАЯ ВЕРСИЯ
  async cleanupOldSchedules(userId) {
    try {
      const currentDate = new Date();
      const todayString = currentDate.toISOString().split('T')[0];

      // Получаем данные пользователя
      const { data: userData } = await adminSupabase
        .from('user_data')
        .select('today_schedule, week_schedule, schedule_updated_at')
        .eq('user_id', userId)
        .single();

      if (userData) {
        const updateData = {};
        const scheduleUpdated = userData.schedule_updated_at ? new Date(userData.schedule_updated_at) : null;
        
        // Очищаем today_schedule если оно старше 1 дня
        if (userData.today_schedule && scheduleUpdated) {
          const daysDiff = (currentDate - scheduleUpdated) / (1000 * 60 * 60 * 24);
          if (daysDiff > 1) {
            updateData.today_schedule = null;
            console.log('🧹 Очищено устаревшее расписание на день');
          }
        }

        // Очищаем week_schedule если оно старше 1 недели
        if (userData.week_schedule && scheduleUpdated) {
          const daysDiff = (currentDate - scheduleUpdated) / (1000 * 60 * 60 * 24);
          if (daysDiff > 7) {
            updateData.week_schedule = null;
            console.log('🧹 Очищено устаревшее расписание на неделю');
          }
        }

        if (Object.keys(updateData).length > 0) {
          await adminSupabase
            .from('user_data')
            .update(updateData)
            .eq('user_id', userId);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка очистки устаревших расписаний:', error);
    }
  },

  // Функция для получения номера недели (ISO 8601)
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
};