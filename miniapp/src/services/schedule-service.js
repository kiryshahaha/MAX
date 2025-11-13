// services/schedule-service.js
import { getAdminSupabase } from "../../lib/supabase-client";

export const scheduleService = {
  async saveUserSchedule(userId, scheduleData, scheduleType, dateParams = null, shouldSave = true) {
    try {
      const adminSupabase = getAdminSupabase();

      console.log('💾 Сохраняем расписание в БД для пользователя:', userId);
      console.log('📅 Тип расписания:', scheduleType);
      console.log('📊 Количество занятий:', scheduleData?.length || 0);

      // ФИКС: Используем локальную дату вместо UTC
      const currentDate = new Date();
      const todayString = this.formatDateToYYYYMMDD(currentDate); // Исправленная функция
      const weekNumber = this.getWeekNumber(currentDate);
      const isEvenWeek = this.isEvenWeek(weekNumber);

      console.log('📅 Локальная дата:', todayString);
      console.log('🔢 Номер недели:', weekNumber);
      console.log('⚖️ Четность недели:', isEvenWeek ? 'Четная' : 'Нечетная');

      const updateData = {
        schedule_updated_at: currentDate.toISOString()
      };

      // Для недельного расписания
 if (scheduleType === 'week') {
        const currentWeek = this.getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();

        console.log('✅ Сохраняем расписание для текущей недели:', currentWeek);

        // ФИКС: Сохраняем номер недели и год в метаданных
        updateData.week_schedule = {
          ...scheduleData,
          metadata: {
            week_number: currentWeek,
            year: currentYear,
            is_even_week: isEvenWeek,
            schedule_updated_at: currentDate.toISOString()
          }
        };

        // ФИКС: Добавляем отдельные поля для быстрого доступа
        updateData.current_week_number = currentWeek;
        updateData.current_week_year = currentYear;

      } else if (scheduleType === 'today') {
        console.log('✅ Сохраняем расписание на сегодня:', todayString);

        // ФИКС: Правильно определяем день недели и дату в формате DD.MM
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[currentDate.getDay()];
        const date_dd_mm = `${String(currentDate.getDate()).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        // Создаем объект расписания с метаданными внутри
        const todayScheduleWithMetadata = {
          date: todayString, // Теперь это правильная локальная дата
          date_dd_mm: date_dd_mm,
          day_name: dayName,
          day_of_week: currentDate.getDay(),
          schedule: scheduleData || [],
          has_schedule: (scheduleData && scheduleData.length > 0) || false,
          metadata: {
            system_date: todayString,
            week_number: weekNumber,
            is_even_week: isEvenWeek,
            schedule_updated_at: currentDate.toISOString()
          }
        };

        updateData.today_schedule = todayScheduleWithMetadata;
        updateData.today_date = todayString;
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

      console.log('💾 Результат сохранения расписания:', {
        savedToDatabase: true,
        systemDate: todayString,
        weekNumber: weekNumber,
        isEvenWeek: isEvenWeek
      });
      
      return { 
        savedToDatabase: true, 
        data: result,
        metadata: {
          systemDate: todayString,
          weekNumber: weekNumber,
          isEvenWeek: isEvenWeek
        }
      };

    } catch (error) {
      console.error('❌ Ошибка сохранения расписания:', error);
      throw error;
    }
  },

  async getUserSchedule(userId, scheduleType) {
    try {
      const adminSupabase = getAdminSupabase();

      let selectField;

      if (scheduleType === 'today') {
        selectField = 'today_schedule, today_date';
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
        
        // Если это today_schedule и есть метаданные внутри
        if (scheduleType === 'today' && data.today_schedule && data.today_schedule.metadata) {
          console.log('📋 Метаданные из today_schedule:', {
            systemDate: data.today_schedule.metadata.system_date,
            weekNumber: data.today_schedule.metadata.week_number,
            isEvenWeek: data.today_schedule.metadata.is_even_week
          });
        }
        
        return data;
      }

      console.log('📋 Расписание не найдено в БД');
      return null;

    } catch (error) {
      console.error('❌ Ошибка получения расписания:', error);
      throw error;
    }
  },

  // Проверка актуальности расписания с учетом метаданных внутри today_schedule
  isScheduleActual(scheduleType, scheduleData = null) {
    const currentDate = new Date();
    const todayString = this.formatDateToYYYYMMDD(currentDate); // Исправленная функция

    if (!scheduleData) return false;

    if (scheduleType === 'today') {
      // Проверяем метаданные внутри today_schedule
      if (scheduleData.today_schedule && scheduleData.today_schedule.metadata) {
        const metadata = scheduleData.today_schedule.metadata;
        return metadata.system_date === todayString;
      }
      return false;
     } else if (scheduleType === 'week') {
      // ФИКС: Проверяем метаданные внутри week_schedule
      if (scheduleData.week_schedule && scheduleData.week_schedule.metadata) {
        const metadata = scheduleData.week_schedule.metadata;
        return metadata.week_number === currentWeek;
      }
      return false;
    }

    return false;
  },

  // Очистка устаревших расписаний
  async cleanupOldSchedules(userId) {
    try {
      const adminSupabase = getAdminSupabase();

      const currentDate = new Date();
      const todayString = this.formatDateToYYYYMMDD(currentDate); // Исправленная функция

      // Получаем данные пользователя
      const { data: userData } = await adminSupabase
        .from('user_data')
        .select('today_schedule, week_schedule, schedule_updated_at')
        .eq('user_id', userId)
        .single();

      if (userData) {
        const updateData = {};
        
        // Очищаем today_schedule если дата в метаданных не совпадает с текущей
        if (userData.today_schedule && userData.today_schedule.metadata) {
          if (userData.today_schedule.metadata.system_date !== todayString) {
            updateData.today_schedule = null;
            updateData.today_date = null;
            console.log('🧹 Очищено устаревшее расписание на день');
          }
        }

        // Очищаем week_schedule если оно старше 1 недели
          if (userData.week_schedule && userData.week_schedule.metadata) {
          if (userData.week_schedule.metadata.week_number !== currentWeek) {
            updateData.week_schedule = null;
            updateData.current_week_number = null;
            updateData.current_week_year = null;
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

  // ФИКС: Новая функция для форматирования даты в YYYY-MM-DD в локальном времени
  formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Функция для получения номера недели (ISO 8601)
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  // Функция для определения четности недели
  isEvenWeek(weekNumber) {
    return weekNumber % 2 === 0;
  }
};