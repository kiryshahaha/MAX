const PSYCHOLOGIST_API_URL = process.env.PSYCHOLOGIST_API_URL

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const psychologistName = searchParams.get('psychologist_name');
    const date = searchParams.get('date');

    if (!psychologistName || !date) {
      return Response.json({ 
        message: '❌ Psychologist name and date are required',
        success: false
      }, { status: 400 });
    }


    const backendResponse = await fetch(
      `${PSYCHOLOGIST_API_URL}/schedule/${encodeURIComponent(psychologistName)}?date=${date}`
    );

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();

    return Response.json({
      success: true,
      schedule: backendData.schedule || [],
      source: 'backend'
    });

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения расписания: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}