// app/api/post-profile/route.js
import { userService } from "@/services/user-service";
import { profileService } from "@/services/profile-service";
import { logsService } from "@/services/logs-service";
import { adminSupabase } from "../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  let username;
  
  try {
    const { username: reqUsername, password } = await request.json();
    username = reqUsername;

    if (!username || !password) {
      return Response.json({ 
        message: '❌ Укажите логин и пароль',
        success: false
      }, { status: 400 });
    }

    console.log('🔍 Получаем профиль от парсера для пользователя:', username);

    const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text();
      throw new Error(`Parser service error: ${parserResponse.status} - ${errorText}`);
    }

    const result = await parserResponse.json();
    console.log('📊 Результат от парсера:', { 
      success: result.success, 
      profile: result.profile ? 'получен' : 'не получен'
    });

    if (result.success && result.profile) {
      try {
        // Создание/обновление пользователя
        const userResult = await userService.createOrUpdateUser(username, password);
        console.log('👤 Результат создания пользователя:', { 
          userId: userResult.userId
        });
        
        // Сохранение профиля в user_data
        const saveResult = await profileService.saveUserProfile(userResult.userId, result.profile);
        console.log('💾 Результат сохранения профиля:', saveResult);
        
        // Логируем успешный вход
        await logsService.logLogin(username, true, 1, 'profile');
      } catch (dbError) {
        console.error('❌ Ошибка работы с БД:', dbError.message);
        result.dbError = dbError.message;
      }
    } else {
      await logsService.logLogin(username, false, 0, result.message, 'profile');
    }

    return Response.json(result);

  } catch (error) {
    console.error('❌ Profile API Error:', error);
    
    if (username) {
      await logsService.logLogin(username, false, 0, error.message, 'profile');
    }
    
    return Response.json(
      { 
        message: `❌ Ошибка получения профиля: ${error.message}`,
        success: false,
        profile: null
      },
      { status: 500 }
    );
  }
}