// app/api/profile/route.js
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

    console.log('👤 Запрашиваем профиль для пользователя:', userId);

    // Запрашиваем профиль из бэкенда (FastAPI)
    const backendResponse = await fetch(`http://127.0.0.1:8000/profile?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда (профиль):', backendData);

    if (backendData.success && backendData.profile) {
      console.log('✅ Используем профиль из бэкенда');
      return Response.json({
        success: true,
        profile: backendData.profile,
        source: 'backend'
      });
    } else {
      console.log('🔄 Профиль отсутствует в бэкенде');
      return Response.json({
        success: false,
        message: 'Профиль не найден в бэкенде',
        profile: null
      });
    }

  } catch (error) {
    console.error('❌ Profile API Error:', error);
    return Response.json(
      { 
        message: `❌ Ошибка получения профиля: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}