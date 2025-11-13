// app/api/psychologists/appointments/route.js
const PSYCHOLOGIST_API_URL = process.env.PSYCHOLOGIST_API_URL

export async function POST(request) {
  try {
    const appointmentData = await request.json();

    console.log('📝 Создание записи к психологу:', appointmentData);

    const backendResponse = await fetch(`${PSYCHOLOGIST_API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    // Получаем полный ответ от бэкенда для отладки
    const responseText = await backendResponse.text();
    console.log('📊 Ответ от бэкенда (сырой текст):', responseText);

    let backendData;
    try {
      backendData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON от бэкенда:', e);
      throw new Error(`Backend returned invalid JSON: ${responseText}`);
    }

    console.log('📊 Ответ от бэкенда (парсинг):', backendData);

    if (!backendResponse.ok) {
      // Получаем детальную информацию об ошибке валидации
      console.error('❌ Детали ошибки от бэкенда:', backendData);
      throw new Error(`Backend error: ${backendResponse.status} - ${JSON.stringify(backendData)}`);
    }

    return Response.json({
      success: true,
      message: backendData.message,
      appointment: backendData.appointment,
      source: 'backend'
    });

  } catch (error) {
    console.error('❌ Appointment API Error:', error);
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

    console.log('👤 Запрашиваем записи для пользователя:', userId);

    const backendResponse = await fetch(`${PSYCHOLOGIST_API_URL}/appointments/${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда (записи):', backendData);

    return Response.json({
      success: true,
      appointments: backendData.appointments || [],
      source: 'backend'
    });

  } catch (error) {
    console.error('❌ Appointments API Error:', error);
    return Response.json(
      { 
        message: `❌ Ошибка получения записей: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}