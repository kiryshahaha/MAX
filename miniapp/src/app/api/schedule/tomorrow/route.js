// app/api/schedule/tomorrow/route.js
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

    console.log('📅 Запрашиваем расписание на завтра для пользователя:', userId);

    // 1. Обращаемся к Python бэкенду
    const backendResponse = await fetch(`http://127.0.0.1:8000/schedule/tomorrow?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда (tomorrow):', backendData);

    // 2. Проверяем успешность ответа
    if (backendData.success && backendData.schedule) {
      console.log('✅ Используем расписание на завтра из бэкенда');
      console.log('   - Количество занятий:', backendData.schedule.schedule?.length || 0);
      console.log('   - Дата:', backendData.schedule.date_dd_mm);
      
      return Response.json({
        success: true,
        schedule: backendData.schedule,
        source: 'backend'
      });
    } else {
      console.log('🔄 Расписание на завтра не найдено в бэкенде');
      
      return Response.json({
        success: false,
        message: 'Расписание на завтра не найдено',
        needsUpdate: true,
        schedule: null
      });
    }

  } catch (error) {
    console.error('❌ Tomorrow Schedule API Error:', error);
    return Response.json(
      { 
        message: `❌ Ошибка получения расписания на завтра: ${error.message}`,
        success: false,
        needsUpdate: true
      },
      { status: 500 }
    );
  }
}