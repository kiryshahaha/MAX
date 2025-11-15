import { getAdminSupabase } from "../../../../lib/supabase-client";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('uid');

    if (!userId) {
      return Response.json({
        message: '❌ User ID is required',
        success: false
      }, { status: 400 });
    }


    const adminSupabase = getAdminSupabase();
    
    const { data: userData, error: userDataError } = await adminSupabase
      .from('user_data')
      .select('reports, reports_updated_at')
      .eq('user_id', userId)
      .single();

    if (userDataError) {
      if (userDataError.code === 'PGRST116') {
      } else {
        throw userDataError;
      }
    }


    const shouldUpdateFromParser = !userData || 
      !userData.reports || 
      !userData.reports_updated_at ||
      isDataOutdated(userData.reports_updated_at);


    if (!shouldUpdateFromParser) {
      return Response.json({
        success: true,
        reports: userData.reports,
        reports_count: userData.reports?.length || 0,
        source: 'supabase'
      });
    }

    
    return Response.json({
      success: false,
      message: 'Данные устарели или отсутствуют.',
      reports: userData?.reports || null,
      reports_count: userData?.reports?.length || 0,
      needs_update: true
    });

  } catch (error) {
    return Response.json(
      {
        message: `❌ Ошибка получения отчетов: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}

function isDataOutdated(updatedAt) {
  if (!updatedAt) return true;
  
  try {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    
    const diffInMinutes = (now - lastUpdate) / (1000 * 60);
    
    
    return diffInMinutes > 30; 
  } catch (error) {
    return true;
  }
}