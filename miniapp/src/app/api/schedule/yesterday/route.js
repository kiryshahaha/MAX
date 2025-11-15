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

    const backendResponse = await fetch(`${fastApiUrl}/schedule/yesterday?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();

    if (backendData.success && backendData.schedule) {
      
      return Response.json({
        success: true,
        schedule: backendData.schedule,
        source: 'backend'
      });
    } else {
      
      return Response.json({
        success: false,
        message: 'Расписание на вчера не найдено',
        needsUpdate: true,
        schedule: null
      });
    }

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения расписания на вчера: ${error.message}`,
        success: false,
        needsUpdate: true
      },
      { status: 500 }
    );
  }
}