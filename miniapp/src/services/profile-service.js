// services/profile-service.js
import { adminSupabase } from "../../lib/supabase-client";

export const profileService = {
  async saveUserProfile(userId, profile) {
    try {
      console.log('💾 Начинаем сохранение профиля для пользователя:', userId);
      
      const profileData = {
        profile: profile,
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Проверяем существующую запись...');
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, profile')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Ошибка при проверке существующей записи:', selectError);
        throw selectError;
      }

      console.log('📊 Существующая запись:', existingData ? 'найдена' : 'не найдена');

      let result;
      
      if (existingData) {
        console.log('🔄 Обновляем существующую запись (профиль)...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(profileData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления профиля:', error);
          throw error;
        }
        result = data;
        console.log('✅ Профиль обновлен для пользователя', userId);
      } else {
        console.log('🆕 Создаем новую запись с профилем...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...profileData
          })
          .select();

        if (error) {
          console.error('❌ Ошибка создания записи с профилем:', error);
          throw error;
        }
        result = data;
        console.log('✅ Создана запись с профилем для пользователя', userId);
      }

      console.log('💾 Результат сохранения профиля:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка сохранения профиля:', error);
      throw error;
    }
  },

  async getUserProfile(userId) {
    try {
      const { data, error } = await adminSupabase
        .from('user_data')
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.profile || null;
    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      throw error;
    }
  }
};