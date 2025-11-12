// app/api/schedule/today/route.js
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

    console.log('📅 Запрашиваем расписание для пользователя:', userId);

    // ФИКС: Получаем текущую дату в локальном времени
    const currentDate = new Date();
    const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    console.log('📅 Текущая локальная дата:', currentDateString);

    // 1. Сначала проверяем бэкенд (как было в оригинальной логике)
    const backendResponse = await fetch(`http://127.0.0.1:8000/schedule/today?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда:', backendData);

    // 2. УЛУЧШЕННАЯ ПРОВЕРКА: учитываем флаг has_schedule от бэкенда И дату
    const hasValidSchedule = backendData.success &&
      backendData.schedule &&
      backendData.schedule.date === currentDateString && // ФИКС: проверяем соответствие даты
      backendData.schedule.has_schedule !== false; // Ключевое изменение!

    console.log('🔍 Детальная проверка данных:', {
      success: backendData.success,
      hasSchedule: !!backendData.schedule,
      scheduleDate: backendData.schedule?.date,
      currentDate: currentDateString,
      hasScheduleFlag: backendData.schedule?.has_schedule,
      hasValidSchedule
    });

    // 3. Если расписание есть и флаг has_schedule не false и дата совпадает - используем его
    if (hasValidSchedule) {
      console.log('✅ Используем актуальное расписание из бэкенда');
      console.log('   - Количество занятий:', backendData.schedule.schedule?.length || 0);
      console.log('   - Флаг has_schedule:', backendData.schedule.has_schedule);
      console.log('   - Дата совпадает:', backendData.schedule.date === currentDateString);
      return Response.json({
        success: true,
        schedule: backendData.schedule,
        source: 'backend'
      });
    } else {
      console.log('🔄 Расписание отсутствует, устарело или дата не совпадает в бэкенде');
      console.log('   - Причина:', 
        !backendData.success ? 'API не успешно' : 
        !backendData.schedule ? 'Нет объекта schedule' : 
        backendData.schedule.date !== currentDateString ? `Дата не совпадает (${backendData.schedule.date} vs ${currentDateString})` : 
        'Флаг has_schedule = false');
      
      // ФИКС: Возвращаем информацию о необходимости обновления
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
    console.error('❌ Schedule API Error:', error);
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