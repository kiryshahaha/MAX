// app/api/post-marks/route.js
import { userService } from "@/services/user-service";
import { marksService } from "@/services/marks-service";
import { logsService } from "@/services/logs-service";
import { adminSupabase } from "../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  let username;
  
  try {
    const { username: reqUsername, password, semester = null, contrType = 0, teacher = 0, mark = 0 } = await request.json();
    username = reqUsername;

    if (!username || !password) {
      return Response.json({ 
        message: '❌ Укажите логин и пароль',
        success: false
      }, { status: 400 });
    }

    console.log('🔍 Получаем оценки от парсера для пользователя:', username);

    const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/marks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, semester, contrType, teacher, mark }),
    });

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text();
      throw new Error(`Parser service error: ${parserResponse.status} - ${errorText}`);
    }

    const result = await parserResponse.json();
    console.log('📊 Результат от парсера:', { 
      success: result.success, 
      marksCount: result.marks?.length 
    });

    if (result.success && result.marks) {
      try {
        // Создание/обновление пользователя
        const userResult = await userService.createOrUpdateUser(username, password);
        console.log('👤 Результат создания пользователя:', { 
          userId: userResult.userId
        });
        
        // Сохранение оценок в user_data
        const saveResult = await marksService.saveUserMarks(userResult.userId, result.marks);
        console.log('💾 Результат сохранения оценок:', saveResult);
        
        // Проверяем, что данные действительно сохранились
        if (saveResult) {
          console.log('✅ Оценки успешно сохранены в БД');
          
          // Дополнительная проверка: читаем обратно из БД
          const { data: checkData, error: checkError } = await adminSupabase
            .from('user_data')
            .select('marks, updated_at')
            .eq('user_id', userResult.userId)
            .single();
            
          if (checkError) {
            console.error('❌ Ошибка проверки сохраненных оценок:', checkError);
          } else {
            console.log('✅ Проверка БД: сохранено оценок:', checkData.marks?.length);
            console.log('✅ Время обновления:', checkData.updated_at);
          }
        }
        
        // Логируем успешный вход
        await logsService.logLogin(username, true, result.marks.length, 'marks');
      } catch (dbError) {
        console.error('❌ Ошибка работы с БД:', dbError.message);
        result.dbError = dbError.message;
      }
    } else {
      await logsService.logLogin(username, false, 0, result.message, 'marks');
    }

    return Response.json(result);

  } catch (error) {
    console.error('❌ Marks API Error:', error);
    
    if (username) {
      await logsService.logLogin(username, false, 0, error.message, 'marks');
    }
    
    return Response.json(
      { 
        message: `❌ Ошибка получения оценок: ${error.message}`,
        success: false,
        marks: []
      },
      { status: 500 }
    );
  }
}