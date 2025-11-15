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


    const fastApiUrl = process.env.FASTAPI_URL;

    const backendResponse = await fetch(`${fastApiUrl}/schedule/week?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();

    const hasValidWeekSchedule = backendData.success && 
      backendData.schedule && 
      backendData.schedule.schedule && 
      backendData.schedule.schedule.days && 
      Array.isArray(backendData.schedule.schedule.days) && 
      backendData.schedule.schedule.days.length > 0;


    if (hasValidWeekSchedule) {
      
      return Response.json({
        success: true,
        schedule: backendData.schedule.schedule, 
        week: backendData.schedule.schedule.metadata?.week_number,
        metadata: backendData.schedule.schedule.metadata,
        source: 'backend'
      });
    } else {
      
      return Response.json({
        success: false,
        message: 'Недельное расписание не найдено или пустое',
        needsUpdate: true,
        schedule: null
      });
    }

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения недельного расписания: ${error.message}`,
        success: false,
        needsUpdate: true
      },
      { status: 500 }
    );
  }
}