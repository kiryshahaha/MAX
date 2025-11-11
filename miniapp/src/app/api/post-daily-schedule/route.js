// app/api/post-daily-schedule/route.js
import { userService } from "@/services/user-service";
import { scheduleService } from "@/services/schedule-service";
import { logsService } from "@/services/logs-service";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, date, saveToDatabase = false } = await request.json();
        username = reqUsername;

        if (!username || !password) {
            return Response.json({
                message: '❌ Укажите логин и пароль',
                success: false
            }, { status: 400 });
        }

        if (!date) {
            return Response.json({
                message: '❌ Укажите дату',
                success: false
            }, { status: 400 });
        }

        console.log('🔍 Получаем расписание на день от парсера для пользователя:', username, { date, saveToDatabase });

        const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/daily-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, date }),
        });

        if (!parserResponse.ok) {
            const errorText = await parserResponse.text();
            throw new Error(`Parser service error: ${parserResponse.status} - ${errorText}`);
        }

        const result = await parserResponse.json();
        console.log('📊 Результат от парсера (день):', {
            success: result.success,
            scheduleCount: result.schedule ? result.schedule.length : 0,
            message: result.message
        });

        // Если парсер успешно отработал (даже если занятий нет)
        if (result.success) {
            try {
                // Создание/обновление пользователя
                const userResult = await userService.createOrUpdateUser(username, password);

                // Очищаем устаревшие расписания
                await scheduleService.cleanupOldSchedules(userResult.userId);

                // Сохранение расписания (даже пустого, если пользователь хочет сохранить)
                const saveResult = await scheduleService.saveUserSchedule(
                    userResult.userId,
                    result.schedule || [], // сохраняем пустой массив если нет занятий
                    'today',
                    { date: result.date },
                    saveToDatabase // используем только явное сохранение от пользователя
                );

                if (saveResult.savedToDatabase) {
                    console.log('💾 Расписание на день сохранено в БД');
                    result.savedToDatabase = true;
                } else {
                    console.log('💾 Расписание на день не сохранено в БД');
                    result.savedToDatabase = false;
                }

                // Логируем успешный запрос
                await logsService.logLogin(
                    username,
                    true,
                    result.schedule ? result.schedule.length : 0,
                    'daily_schedule'
                );
            } catch (dbError) {
                console.error('❌ Ошибка работы с БД:', dbError.message);
                result.dbError = dbError.message;
            }
        } else {
            // Логируем неудачный запрос к парсеру
            await logsService.logLogin(username, false, 0, result.message, 'daily_schedule');
        }

        return Response.json(result);

    } catch (error) {
        console.error('❌ Daily Schedule API Error:', error);

        if (username) {
            await logsService.logLogin(username, false, 0, error.message, 'daily_schedule');
        }

        return Response.json(
            {
                message: `❌ Ошибка получения расписания на день: ${error.message}`,
                success: false,
                schedule: null
            },
            { status: 500 }
        );
    }
}
