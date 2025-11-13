// app/api/reports/route.js
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

    console.log('📝 Запрашиваем отчеты для пользователя:', userId);

    // 1. Сначала проверяем бэкенд (Supabase)
    const backendResponse = await fetch(`http://127.0.0.1:8000/reports?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда (отчеты):', backendData);

    // 2. Проверяем наличие отчетов в бэкенде
    const hasValidReports = backendData.success && 
      backendData.reports && 
      backendData.reports_count > 0;

    console.log('🔍 Проверка отчетов:', {
      success: backendData.success,
      hasReports: !!backendData.reports,
      reportsCount: backendData.reports_count,
      hasValidReports
    });

    // 3. Если отчеты есть - используем их
    if (hasValidReports) {
      console.log('✅ Используем отчеты из бэкенда');
      return Response.json({
        success: true,
        reports: backendData.reports,
        reports_count: backendData.reports_count,
        source: 'backend'
      });
    } else {
      console.log('🔄 Отчеты отсутствуют в бэкенде');
      return Response.json({
        success: false,
        message: 'Отчеты не найдены в бэкенде',
        reports: null,
        reports_count: 0
      });
    }

  } catch (error) {
    console.error('❌ Reports API Error:', error);
    return Response.json(
      { 
        message: `❌ Ошибка получения отчетов: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}