import { getAdminSupabase } from "../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

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
      .select('tasks, tasks_updated_at')
      .eq('user_id', userId)
      .single();

    if (userDataError) {
      if (userDataError.code === 'PGRST116') {
      } else {
        throw userDataError;
      }
    }


    const shouldUpdateFromParser = !userData || 
      !userData.tasks || 
      !userData.tasks_updated_at ||
      isDataOutdated(userData.tasks_updated_at);


    if (!shouldUpdateFromParser) {
      return Response.json({
        success: true,
        tasks: userData.tasks,
        tasks_count: userData.tasks?.length || 0,
        source: 'supabase'
      });
    }

    return Response.json({
      success: false,
      message: 'Данные устарели или отсутствуют. Используйте кнопку обновления.',
      tasks: userData?.tasks || null,
      tasks_count: userData?.tasks?.length || 0,
      needs_update: true
    });

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения задач.`,
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