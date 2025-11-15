import { getAdminSupabase } from "../../../../../lib/supabase-client";

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


    const currentDate = new Date();
    const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    

    const fastApiUrl = process.env.FASTAPI_URL;

    const backendResponse = await fetch(`${fastApiUrl}/schedule/today?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();

    const hasValidSchedule = backendData.success &&
      backendData.schedule &&
      backendData.schedule.date === currentDateString && 
      backendData.schedule.has_schedule !== false;


    if (hasValidSchedule) {
      return Response.json({
        success: true,
        schedule: backendData.schedule,
        source: 'backend'
      });
    } else {
      return Response.json({
        success: false,
        message: 'Расписание не найдено или устарело в бэкенде',
        needsUpdate: true,
        reason: backendData.schedule?.date !== currentDateString ? 'date_mismatch' : 'no_schedule',
        currentDate: currentDateString,
        scheduleDate: backendData.schedule?.date,
        schedule: null
      });
    }

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения расписания: ${error.message}`,
        success: false,
        needsUpdate: true
      },
      { status: 500 }
    );
  }
}