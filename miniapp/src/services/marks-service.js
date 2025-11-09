// services/marks-service.js
import { adminSupabase } from "../../lib/supabase-client";
import { CONTROL_TYPES, MARK_TYPES } from "../constants/marks-constants";

export const marksService = {
  async saveUserMarks(userId, marks) {
    try {
      console.log('💾 Начинаем сохранение оценок для пользователя:', userId);
      console.log('📝 Количество оценок для сохранения:', marks.length);
      
      // Добавляем человекочитаемые названия для типов контроля и оценок
      const enrichedMarks = marks.map(mark => ({
        ...mark,
        controlTypeText: CONTROL_TYPES[mark.controlTypeValue] || mark.controlType,
        markText: MARK_TYPES[mark.markValue] || mark.mark.value
      }));
      
      const marksData = {
        marks: enrichedMarks,
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Проверяем существующую запись...');
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, marks')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Ошибка при проверке существующей записи:', selectError);
        throw selectError;
      }

      console.log('📊 Существующая запись:', existingData ? 'найдена' : 'не найдена');

      let result;
      
      if (existingData) {
        console.log('🔄 Обновляем существующую запись (оценки)...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(marksData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления оценок:', error);
          throw error;
        }
        result = data;
        console.log('✅ Оценки обновлены для пользователя', userId);
      } else {
        console.log('🆕 Создаем новую запись с оценками...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...marksData
          })
          .select();

        if (error) {
          console.error('❌ Ошибка создания записи с оценками:', error);
          throw error;
        }
        result = data;
        console.log('✅ Создана запись с оценками для пользователя', userId);
      }

      console.log('💾 Результат сохранения оценок:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка сохранения оценок:', error);
      throw error;
    }
  }
};