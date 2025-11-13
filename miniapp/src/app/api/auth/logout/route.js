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

    // 1. Отправляем запрос на логаут в парсер (если нужно)
    try {
      await fetch(`${PARSER_SERVICE_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      console.log('✅ Логаут в парсере выполнен');
    } catch (parserError) {
      console.warn('⚠️ Ошибка логаута в парсере:', parserError.message);
      // Продолжаем выполнение, даже если парсер недоступен
    }

    // 2. Выход из Supabase
    const { error: supabaseError } = await clientSupabase.auth.signOut();
    
    if (supabaseError) {
      throw new Error(`Supabase logout error: ${supabaseError.message}`);
    }

    console.log('✅ Успешный выход из системы');

    return Response.json({
      success: true,
      message: 'Успешный выход из системы'
    });

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