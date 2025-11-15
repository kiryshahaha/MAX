import { getAdminSupabase } from "../../lib/supabase-client";

export const profileService = {
  async saveUserProfile(userId, profile) {
    try {

 const adminSupabase = getAdminSupabase();

      
      const profileData = {
        profile: profile,
        updated_at: new Date().toISOString()
      };

      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, profile')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }


      let result;
      
      if (existingData) {
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(profileData)
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
            ...profileData
          })
          .select();

        if (error) {
          throw error;
        }
        result = data;
      }

      return result;
      
    } catch (error) {
      throw error;
    }
  },

  async getUserProfile(userId) {
    try {

 const adminSupabase = getAdminSupabase();

      const { data, error } = await adminSupabase
        .from('user_data')
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.profile || null;
    } catch (error) {
      throw error;
    }
  }
};