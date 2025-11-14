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

    const adminSupabase = getAdminSupabase();
    
    // 1. Сначала проверяем данные в Supabase
    console.log('🔍 Проверяем данные отчетов в Supabase...');
    const { data: userData, error: userDataError } = await adminSupabase
      .from('user_data')
      .select('reports, reports_updated_at')
      .eq('user_id', userId)
      .single();

    // Обрабатываем случай, когда запись не найдена
    if (userDataError) {
      if (userDataError.code === 'PGRST116') {
        console.log('📊 Запись пользователя не найдена в БД');
      } else {
        console.error('❌ Ошибка при получении данных отчетов:', userDataError);
        throw userDataError;
      }
    }

    console.log('📊 Данные отчетов из Supabase:', userData);

    // 2. Проверяем актуальность данных
    const shouldUpdateFromParser = !userData || 
      !userData.reports || 
      !userData.reports_updated_at ||
      isDataOutdated(userData.reports_updated_at);

    console.log('🔍 Проверка актуальности отчетов:', {
      hasUserData: !!userData,
      hasReports: !!(userData?.reports),
      hasUpdatedAt: !!(userData?.reports_updated_at),
      isOutdated: isDataOutdated(userData?.reports_updated_at),
      shouldUpdateFromParser
    });

    // 3. Если данные актуальны - возвращаем их
    if (!shouldUpdateFromParser) {
      console.log('✅ Используем актуальные отчеты из Supabase');
      return Response.json({
        success: true,
        reports: userData.reports,
        reports_count: userData.reports?.length || 0,
        source: 'supabase'
      });
    }

    // 4. Если данные устарели или отсутствуют - возвращаем пустой результат
    console.log('🔄 Отчеты устарели или отсутствуют, требуется ручное обновление');
    
    return Response.json({
      success: false,
      message: 'Данные устарели или отсутствуют. Используйте кнопку обновления.',
      reports: userData?.reports || null,
      reports_count: userData?.reports?.length || 0,
      needs_update: true
    });

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

// Функция проверки актуальности данных (более 30 минут)
function isDataOutdated(updatedAt) {
  if (!updatedAt) return true;
  
  try {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    
    const diffInMinutes = (now - lastUpdate) / (1000 * 60);
    
    console.log('⏰ Проверка времени обновления:', {
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