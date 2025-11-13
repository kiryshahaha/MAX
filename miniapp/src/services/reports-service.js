import { getAdminSupabase } from "../../lib/supabase-client";

export const reportsService = {
  async saveUserReports(userId, reports) {
    try {

 const adminSupabase = getAdminSupabase();

      console.log('💾 Начинаем сохранение отчетов для пользователя:', userId);
      console.log('📝 Количество отчетов для сохранения:', reports.length);
      
      const reportsData = {
        reports: reports,
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Проверяем существующую запись...');
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, reports')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Ошибка при проверке существующей записи:', selectError);
        throw selectError;
      }

      console.log('📊 Существующая запись:', existingData ? 'найдена' : 'не найдена');

      let result;
      
      if (existingData) {
        console.log('🔄 Обновляем существующую запись (отчеты)...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(reportsData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления отчетов:', error);
          throw error;
        }
        result = data;
        console.log('✅ Отчеты обновлены для пользователя', userId);
      } else {
        console.log('🆕 Создаем новую запись с отчетами...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...reportsData
          })
          .select();

        if (error) {
          console.error('❌ Ошибка создания записи с отчетами:', error);
          throw error;
        }
        result = data;
        console.log('✅ Создана запись с отчетами для пользователя', userId);
      }

      console.log('💾 Результат сохранения отчетов:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка сохранения отчетов:', error);
      throw error;
    }
  }
};