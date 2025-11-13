// app/api/schedule/week/route.js
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

    console.log('📅 Запрашиваем недельное расписание для пользователя:', userId);

    // 1. Сначала проверяем бэкенд
    const backendResponse = await fetch(`http://127.0.0.1:8000/schedule/week?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда (week):', backendData);

    // 2. ПРАВИЛЬНАЯ ПРОВЕРКА: учитываем вложенную структуру
    const hasValidWeekSchedule = backendData.success && 
      backendData.schedule && 
      backendData.schedule.schedule && 
      backendData.schedule.schedule.days && 
      Array.isArray(backendData.schedule.schedule.days) && 
      backendData.schedule.schedule.days.length > 0;

    console.log('🔍 Детальная проверка недельного расписания:', {
      success: backendData.success,
      hasSchedule: !!backendData.schedule,
      hasNestedSchedule: !!backendData.schedule?.schedule,
      hasDays: !!backendData.schedule?.schedule?.days,
      daysIsArray: Array.isArray(backendData.schedule?.schedule?.days),
      daysCount: backendData.schedule?.schedule?.days?.length || 0,
      hasValidWeekSchedule
    });

    // 3. Если расписание есть и есть дни - используем его
    if (hasValidWeekSchedule) {
      console.log('✅ Используем недельное расписание из бэкенда');
      console.log('   - Количество дней:', backendData.schedule.schedule.days.length);
      console.log('   - Номер недели:', backendData.schedule.schedule.metadata?.week_number);
      
      return Response.json({
        success: true,
        schedule: backendData.schedule.schedule, // Берем вложенный schedule
        week: backendData.schedule.schedule.metadata?.week_number,
        metadata: backendData.schedule.schedule.metadata,
        source: 'backend'
      });
    } else {
      console.log('🔄 Недельное расписание отсутствует или пустое в бэкенде');
      console.log('   - Причина:', 
        !backendData.success ? 'API не успешно' : 
        !backendData.schedule ? 'Нет объекта schedule' : 
        !backendData.schedule.schedule ? 'Нет вложенного schedule' : 
        !backendData.schedule.schedule.days ? 'Нет days' : 
        backendData.schedule.schedule.days.length === 0 ? 'Days пустой массив' : 
        'Другие причины');
      
      return Response.json({
        success: false,
        message: 'Недельное расписание не найдено или пустое',
        needsUpdate: true,
        schedule: null
      });
    }

  } catch (error) {
    console.error('❌ Week Schedule API Error:', error);
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