// app/api/post-schedule/route.js
import { userService } from "@/services/user-service";
import { scheduleService } from "@/services/schedule-service";
import { logsService } from "@/services/logs-service";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  let username;
  
  try {
    const { username: reqUsername, password, year = 2025, week = 45, saveToDatabase = false } = await request.json();
    username = reqUsername;

    if (!username || !password) {
      return Response.json({ 
        message: '❌ Укажите логин и пароль',
        success: false
      }, { status: 400 });
    }

    console.log('🔍 Получаем расписание от парсера для пользователя:', username, { year, week, saveToDatabase });

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
        (result.schedule.days?.length + result.schedule.extraClasses?.length) : 0 
    });

    if (result.success && result.schedule) {
      try {
        // Создание/обновление пользователя
        const userResult = await userService.createOrUpdateUser(username, password);
        console.log('👤 Результат создания пользователя:', { 
          userId: userResult.userId
        });
        
        // Проверяем, является ли запрашиваемая неделя текущей
        const currentDate = new Date();
        const currentWeek = scheduleService.getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();
        
        // АВТОМАТИЧЕСКОЕ СОХРАНЕНИЕ: если запрашиваемая неделя совпадает с текущей
        const shouldAutoSave = (parseInt(year) === currentYear && parseInt(week) === currentWeek);
        const finalSaveToDatabase = saveToDatabase || shouldAutoSave;
        
        if (shouldAutoSave) {
          console.log('🔄 АВТОСОХРАНЕНИЕ: запрашиваемая неделя совпадает с текущей:', { 
            requestedWeek: week, 
            currentWeek: currentWeek 
          });
        }
        
        // Очищаем устаревшие расписания (только today_schedule)
        await scheduleService.cleanupOldSchedules(userResult.userId);
        
        // Сохранение расписания в user_data
        const saveResult = await scheduleService.saveUserSchedule(
          userResult.userId, 
          result.schedule, 
          'week',
          { year: result.year, week: result.week },
          finalSaveToDatabase
        );
        
        if (saveResult.savedToDatabase) {
          console.log('💾 Расписание сохранено в БД');
          result.savedToDatabase = true;
          if (shouldAutoSave) {
            result.autoSaved = true;
            result.message += ' (автосохранено как текущая неделя)';
          }
        } else {
          console.log('💾 Расписание не сохранено в БД');
          result.savedToDatabase = false;
          if (saveResult.message) {
            result.saveMessage = saveResult.message;
          }
        }
        
        // Логируем успешный вход
        await logsService.logLogin(
          username, 
          true, 
          (result.schedule.days?.length + result.schedule.extraClasses?.length), 
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