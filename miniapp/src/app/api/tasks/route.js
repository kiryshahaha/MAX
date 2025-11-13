// app/api/tasks/route.js
import { getAdminSupabase } from "../../../../lib/supabase-client";

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

    // 1. Сначала проверяем бэкенд (Supabase)
    const backendResponse = await fetch(`http://127.0.0.1:8000/tasks?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда (задачи):', backendData);

    // 2. Проверяем наличие задач в бэкенде
    const hasValidTasks = backendData.success && 
      backendData.tasks && 
      backendData.tasks_count > 0;

    console.log('🔍 Проверка задач:', {
      success: backendData.success,
      hasTasks: !!backendData.tasks,
      tasksCount: backendData.tasks_count,
      hasValidTasks
    });

    // 3. Если задачи есть - используем их
    if (hasValidTasks) {
      console.log('✅ Используем задачи из бэкенда');
      return Response.json({
        success: true,
        tasks: backendData.tasks,
        tasks_count: backendData.tasks_count,
        source: 'backend'
      });
    } else {
      console.log('🔄 Задачи отсутствуют в бэкенде');
      return Response.json({
        success: false,
        message: 'Задачи не найдены в бэкенде',
        tasks: null,
        tasks_count: 0
      });
    }

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