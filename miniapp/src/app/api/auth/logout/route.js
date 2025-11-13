// app/api/auth/logout/route.js
import { clientSupabase } from "../../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return Response.json({ 
        message: '❌ Username is required',
        success: false
      }, { status: 400 });
    }

    console.log('🚪 Запрос на выход пользователя:', username);

    // 1. Сначала выходим из парсера
    try {
      const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (parserResponse.ok) {
        console.log('✅ Сессия парсера очищена');
      } else {
        console.warn('⚠️ Не удалось очистить сессию парсера');
      }
    } catch (parserError) {
      console.warn('⚠️ Парсер недоступен при логауте:', parserError.message);
    }

    // 2. Затем выходим из Supabase
    const { error: supabaseError } = await clientSupabase.auth.signOut();
    
    if (supabaseError) {
      console.error('Supabase logout error:', supabaseError);
    }

    // 3. Очищаем все данные на клиенте через cookie
    const response = Response.json({
      success: true,
      message: 'Успешный выход из системы'
    });

    // Добавляем headers для очистки клиентских данных
    response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');

    console.log('✅ Успешный выход из системы');

    return response;

  } catch (error) {
    console.error('❌ Logout API Error:', error);
    
    return Response.json(
      { 
        message: `❌ Ошибка при выходе: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}