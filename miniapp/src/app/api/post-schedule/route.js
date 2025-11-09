//api/post-schedule/route.js
import { userService } from "@/services/user-service";
import { scheduleService } from "@/services/schedule-service";
import { logsService } from "@/services/logs-service";
import { adminSupabase } from "../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  let username;
  
  try {
    const { username: reqUsername, password, year = 2025, week = 44 } = await request.json();
    username = reqUsername;

    if (!username || !password) {
      return Response.json({ 
        message: '❌ Укажите логин и пароль',
        success: false
      }, { status: 400 });
    }

    console.log('🔍 Получаем расписание от парсера для пользователя:', username, { year, week });

    const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, year, week }),
    });

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text();
      throw new Error(`Parser service error: ${parserResponse.status} - ${errorText}`);
    }

    const result = await parserResponse.json();
    console.log('📊 Результат от парсера:', { 
      success: result.success, 
      scheduleCount: result.schedule ? 
        (result.schedule.regularClasses?.length + result.schedule.extraClasses?.length) : 0 
    });

    if (result.success && result.schedule) {
      try {
        // Создание/обновление пользователя
        const userResult = await userService.createOrUpdateUser(username, password);
        console.log('👤 Результат создания пользователя:', { 
          userId: userResult.userId
        });
        
        // Сохранение расписания в user_data
        const saveResult = await scheduleService.saveUserSchedule(
          userResult.userId, 
          result.schedule, 
          result.year, 
          result.week
        );
        console.log('💾 Результат сохранения расписания:', saveResult);
        
        // Проверяем, что данные действительно сохранились
        if (saveResult) {
          console.log('✅ Расписание успешно сохранено в БД');
          
          // Дополнительная проверка: читаем обратно из БД
          const { data: checkData, error: checkError } = await adminSupabase
            .from('user_data')
            .select('schedule, schedule_year, schedule_week, updated_at')
            .eq('user_id', userResult.userId)
            .single();
            
          if (checkError) {
            console.error('❌ Ошибка проверки сохраненного расписания:', checkError);
          } else {
            console.log('✅ Проверка БД: сохранено расписание за', 
              checkData.schedule_year, 'неделя', checkData.schedule_week);
            console.log('✅ Время обновления:', checkData.updated_at);
          }
        }
        
        // Логируем успешный вход
        await logsService.logLogin(
          username, 
          true, 
          (result.schedule.regularClasses?.length + result.schedule.extraClasses?.length), 
          'schedule'
        );
      } catch (dbError) {
        console.error('❌ Ошибка работы с БД:', dbError.message);
        result.dbError = dbError.message;
      }
    } else {
      await logsService.logLogin(username, false, 0, result.message, 'schedule');
    }

    return Response.json(result);

  } catch (error) {
    console.error('❌ Schedule API Error:', error);
    
    if (username) {
      await logsService.logLogin(username, false, 0, error.message, 'schedule');
    }
    
    return Response.json(
      { 
        message: `❌ Ошибка получения расписания: ${error.message}`,
        success: false,
        schedule: null
      },
      { status: 500 }
    );
  }
}