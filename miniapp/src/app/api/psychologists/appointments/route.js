const PSYCHOLOGIST_API_URL = process.env.PSYCHOLOGIST_API_URL

export async function POST(request) {
  try {
    const appointmentData = await request.json();


    const backendResponse = await fetch(`${PSYCHOLOGIST_API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    const responseText = await backendResponse.text();

    let backendData;
    try {
      backendData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Backend returned invalid JSON: ${responseText}`);
    }


    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status} - ${JSON.stringify(backendData)}`);
    }

    return Response.json({
      success: true,
      message: backendData.message,
      appointment: backendData.appointment,
      source: 'backend'
    });

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка создания записи: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return Response.json({ 
        message: '❌ User ID is required',
        success: false
      }, { status: 400 });
    }


    const backendResponse = await fetch(`${PSYCHOLOGIST_API_URL}/appointments/${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();

    return Response.json({
      success: true,
      appointments: backendData.appointments || [],
      source: 'backend'
    });

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения записей: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}