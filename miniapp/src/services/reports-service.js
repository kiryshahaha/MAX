import { getAdminSupabase } from "../../lib/supabase-client";

export const reportsService = {
  async saveUserReports(userId, reports) {
    try {
      const adminSupabase = getAdminSupabase();

      
      const reportsData = {
        reports: reports,
        reports_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

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
          .update(reportsData)
          .eq('user_id', userId)
          .select('reports, reports_updated_at, updated_at');

        if (error) {
          throw error;
        }
        result = data;
      } else {
        
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...reportsData
          })
          .select('reports, reports_updated_at, updated_at'); 

        if (error) {
          throw error;
        }
        result = data;
      }

      return result;
      
    } catch (error) {
      throw error;
    }
  }
};