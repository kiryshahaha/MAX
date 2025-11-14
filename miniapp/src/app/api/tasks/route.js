// app/api/tasks/route.js
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

    console.log('📝 Запрашиваем задачи для пользователя:', userId);

    const adminSupabase = getAdminSupabase();
    
    // 1. Сначала проверяем данные в Supabase
    console.log('🔍 Проверяем данные задач в Supabase...');
    const { data: userData, error: userDataError } = await adminSupabase
      .from('user_data')
      .select('tasks, tasks_updated_at')
      .eq('user_id', userId)
      .single();

    // Обрабатываем случай, когда запись не найдена
    if (userDataError) {
      if (userDataError.code === 'PGRST116') {
        console.log('📊 Запись пользователя не найдена в БД');
      } else {
        console.error('❌ Ошибка при получении данных задач:', userDataError);
        throw userDataError;
      }
    }

    console.log('📊 Данные задач из Supabase:', userData);

    // 2. Проверяем актуальность данных
    const shouldUpdateFromParser = !userData || 
      !userData.tasks || 
      !userData.tasks_updated_at ||
      isDataOutdated(userData.tasks_updated_at);

    console.log('🔍 Проверка актуальности задач:', {
      hasUserData: !!userData,
      hasTasks: !!(userData?.tasks),
      hasUpdatedAt: !!(userData?.tasks_updated_at),
      isOutdated: isDataOutdated(userData?.tasks_updated_at),
      shouldUpdateFromParser
    });

    // 3. Если данные актуальны - возвращаем их
    if (!shouldUpdateFromParser) {
      console.log('✅ Используем актуальные задачи из Supabase');
      return Response.json({
        success: true,
        tasks: userData.tasks,
        tasks_count: userData.tasks?.length || 0,
        source: 'supabase'
      });
    }

    // 4. Если данные устарели или отсутствуют - возвращаем пустой результат
    // Теперь логика получения данных через парсера должна быть в update endpoints
    console.log('🔄 Задачи устарели или отсутствуют, требуется ручное обновление');
    
    return Response.json({
      success: false,
      message: 'Данные устарели или отсутствуют. Используйте кнопку обновления.',
      tasks: userData?.tasks || null,
      tasks_count: userData?.tasks?.length || 0,
      needs_update: true
    });

  } catch (error) {
    console.error('❌ Tasks API Error:', error);
    return Response.json(
      { 
        message: `❌ Ошибка получения задач: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}

// Функция проверки актуальности данных (более 30 минут)
function isDataOutdated(updatedAt) {
  if (!updatedAt) return true;
  
  try {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    
    const diffInMinutes = (now - lastUpdate) / (1000 * 60);
    
    console.log('⏰ Проверка времени обновления задач:', {
      lastUpdate: lastUpdate.toISOString(),
      now: now.toISOString(),
      diffInMinutes: Math.round(diffInMinutes),
      isOutdated: diffInMinutes > 30
    });
    
    return diffInMinutes > 30; // 30 минут
  } catch (error) {
    console.error('❌ Ошибка проверки времени:', error);
    return true;
  }
}