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


    try {
      const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (parserResponse.ok) {
      } else {
      }
    } catch (parserError) {
    }

    const { error: supabaseError } = await clientSupabase.auth.signOut();

    if (supabaseError) {
    }

    const response = Response.json({
      success: true,
      message: 'Успешный выход из системы'
    });
    
    response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');


    return response;

  } catch (error) {

    return Response.json(
      {
        message: `❌ Ошибка при выходе: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}