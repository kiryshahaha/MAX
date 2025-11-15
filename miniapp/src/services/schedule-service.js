import { getAdminSupabase } from "../../lib/supabase-client";

export const scheduleService = {
  async saveUserSchedule(userId, scheduleData, scheduleType, dateParams = null, shouldSave = true) {
    try {
      const adminSupabase = getAdminSupabase();

      const currentDate = new Date();
      const todayString = this.formatDateToYYYYMMDD(currentDate); 
      const weekNumber = this.getWeekNumber(currentDate);
      const isEvenWeek = this.isEvenWeek(weekNumber);

      const updateData = {
        schedule_updated_at: currentDate.toISOString()
      };

 if (scheduleType === 'week') {
        const currentWeek = this.getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();

        updateData.week_schedule = {
          ...scheduleData,
          metadata: {
            week_number: currentWeek,
            year: currentYear,
            is_even_week: isEvenWeek,
            schedule_updated_at: currentDate.toISOString()
          }
        };

        updateData.current_week_number = currentWeek;
        updateData.current_week_year = currentYear;

      } else if (scheduleType === 'today') {

        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[currentDate.getDay()];
        const date_dd_mm = `${String(currentDate.getDate()).padStart(2, '0')}.${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        const todayScheduleWithMetadata = {
          date: todayString, 
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

      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }


      let result;

      if (existingData) {
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(updateData)
          .eq('user_id', userId)
          .select();

        if (error) {
          throw error;
        }
        result = data;
      } else {
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...updateData
          })
          .select();

        if (error) {
          throw error;
        }
        result = data;
      }

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
        throw error;
      }

      if (data) {
        
        if (scheduleType === 'today' && data.today_schedule && data.today_schedule.metadata) {
        }
        
        return data;
      }

      return null;

    } catch (error) {
      throw error;
    }
  },

  isScheduleActual(scheduleType, scheduleData = null) {
    const currentDate = new Date();
    const todayString = this.formatDateToYYYYMMDD(currentDate); 

    if (!scheduleData) return false;

    if (scheduleType === 'today') {
      if (scheduleData.today_schedule && scheduleData.today_schedule.metadata) {
        const metadata = scheduleData.today_schedule.metadata;
        return metadata.system_date === todayString;
      }
      return false;
     } else if (scheduleType === 'week') {
      if (scheduleData.week_schedule && scheduleData.week_schedule.metadata) {
        const metadata = scheduleData.week_schedule.metadata;
        return metadata.week_number === currentWeek;
      }
      return false;
    }

    return false;
  },

  async cleanupOldSchedules(userId) {
    try {
      const adminSupabase = getAdminSupabase();

      const currentDate = new Date();
      const todayString = this.formatDateToYYYYMMDD(currentDate); 

      const { data: userData } = await adminSupabase
        .from('user_data')
        .select('today_schedule, week_schedule, schedule_updated_at')
        .eq('user_id', userId)
        .single();

      if (userData) {
        const updateData = {};
        
        if (userData.today_schedule && userData.today_schedule.metadata) {
          if (userData.today_schedule.metadata.system_date !== todayString) {
            updateData.today_schedule = null;
            updateData.today_date = null;
          }
        }

          if (userData.week_schedule && userData.week_schedule.metadata) {
          if (userData.week_schedule.metadata.week_number !== currentWeek) {
            updateData.week_schedule = null;
            updateData.current_week_number = null;
            updateData.current_week_year = null;
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
    }
  },

  formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  isEvenWeek(weekNumber) {
    return weekNumber % 2 === 0;
  }
};