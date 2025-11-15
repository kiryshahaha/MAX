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


    const fastApiUrl = process.env.FASTAPI_URL;

    const backendResponse = await fetch(`${fastApiUrl}/profile?uid=${userId}`);

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();

    if (backendData.success && backendData.profile) {
      return Response.json({
        success: true,
        profile: backendData.profile,
        source: 'backend'
      });
    } else {
      return Response.json({
        success: false,
        message: 'Профиль не найден в бэкенде',
        profile: null
      });
    }

  } catch (error) {
    return Response.json(
      { 
        message: `❌ Ошибка получения профиля: ${error.message}`,
        success: false
      },
      { status: 500 }
    );
  }
}