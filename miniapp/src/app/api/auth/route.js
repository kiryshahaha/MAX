import { userService } from "@/services/user-service";
import { tasksService } from "@/services/tasks-service";
import { logsService } from "@/services/logs-service";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ 
        message: '❌ Укажите логин и пароль' 
      }, { status: 400 });
    }

    // Вызов микросервиса парсера
    const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!parserResponse.ok) {
      throw new Error(`Parser service error: ${parserResponse.status}`);
    }

    const result = await parserResponse.json();

    if (result.success) {
      // Создание/обновление пользователя
      const userResult = await userService.createOrUpdateUser(username, password);
      
      // Сохранение задач в user_data
      if (userResult.userId && result.tasks) {
        await tasksService.saveUserTasks(userResult.userId, result.tasks);
      }
      
      // Добавляем информацию о пользователе в ответ
      result.userAction = userResult.created ? 'created' : 
                         userResult.updated ? 'updated' : 
                         userResult.exists ? 'exists' : 'unknown';

      // Логируем успешный вход
      await logsService.logLogin(username, true, result.tasksCount || 0);
    } else {
      // Логируем неудачную попытку
      await logsService.logLogin(username, false, 0, result.message);
    }

    return Response.json(result);

  } catch (error) {
    console.error('API Error:', error);
    
    if (error.code === 'email_exists' || error.status === 422) {
      const result = { success: true, userAction: 'exists' };
      return Response.json(result);
    }
    
    return Response.json(
      { 
        message: `❌ Ошибка соединения с сервисом парсера: ${error.message}`,
        success: false 
      },
      { status: 500 }
    );
  }
}