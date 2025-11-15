import { userService } from "@/services/user-service";
import { tasksService } from "@/services/tasks-service";
import { logsService } from "@/services/logs-service";
import { RetryHandler } from "../utils/retry-handler";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({
        message: '❌ Укажите логин и пароль'
      }, { status: 400 });
    }

    try {
      const userTasks = await getStoredUserTasks(username);
      if (userTasks && userTasks.tasks && userTasks.tasks.length > 0) {
        return Response.json({
          success: true,
          tasks: userTasks.tasks,
          tasksCount: userTasks.tasks.length,
          message: '✅ Загружены сохраненные задачи',
          fromCache: true
        });
      }
    } catch (cacheError) {
    }

    const parserResponse = await RetryHandler.withRetry(async () => {
      const response = await fetch(`${PARSER_SERVICE_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(`Parser service error: ${response.status}`);
      }

      return response;
    }, 3, 1500);

    const result = await parserResponse.json();

    if (result.success) {
      const userResult = await userService.createOrUpdateUser(username, password);

      if (userResult.userId && result.tasks) {
        await tasksService.saveUserTasks(userResult.userId, result.tasks);
      }

      result.userAction = userResult.created ? 'created' :
        userResult.updated ? 'updated' :
          userResult.exists ? 'exists' : 'unknown';

      await logsService.logLogin(username, true, result.tasksCount || 0);
    } else {
      await logsService.logLogin(username, false, 0, result.message);
    }

    return Response.json(result);

  } catch (error) {

    if (error.code === 'email_exists' || error.status === 422) {
      const result = { success: true, userAction: 'exists' };
      return Response.json(result);
    }

    return Response.json(
      {
        message: `❌ Ошибка соединения с сервисом парсера`,
        success: false
      },
      { status: 500 }
    );
  }
}

async function getStoredUserTasks(username) {
  try {
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) throw listError;

    const email = userService.isValidEmail(username) ? username : `${username}@guap-temp.com`;
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      const { data: userData, error: dataError } = await adminSupabase
        .from('user_data')
        .select('tasks, updated_at')
        .eq('user_id', existingUser.id)
        .single();

      if (!dataError && userData && userData.tasks) {
        return {
          tasks: userData.tasks,
          updatedAt: userData.updated_at
        };
      }
    }
    return null;
  } catch (error) {
    throw error;
  }
}