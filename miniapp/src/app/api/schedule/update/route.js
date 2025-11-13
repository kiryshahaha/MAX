// app/api/schedule/update/route.js
import { userService } from "@/services/user-service";
import { getAdminSupabase } from "../../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, date } = await request.json();
        username = reqUsername;

        if (!username || !password || !date) {
            return Response.json({
                message: '❌ Укажите логин, пароль и дату',
                success: false
            }, { status: 400 });
        }

        console.log('🚀 Запрашиваем расписание у парсера:', { username, date });

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
        console.log('📊 Результат от парсера:', {
            success: result.success,
            scheduleCount: result.schedule?.length
        });

        if (result.success && result.schedule) {
            try {
                // Создание/обновление пользователя
                const userResult = await userService.createOrUpdateUser(username, password);
                console.log('👤 Результат создания пользователя:', {
                    userId: userResult.userId
                });

                // Формируем объект расписания (как в оригинальной логике)
                const scheduleObj = {
                    date: date,
                    date_dd_mm: `${String(new Date(date).getDate()).padStart(2, '0')}.${String(new Date(date).getMonth() + 1).padStart(2, '0')}`,
                    day_name: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(date).getDay()],
                    day_of_week: new Date(date).getDay(),
                    schedule: result.schedule || []
                };

                try {
                    // Сохраняем расписание в БД при каждом обращении к парсеру
                    const { scheduleService } = await import('@/services/schedule-service');
                    const saveResult = await scheduleService.saveUserSchedule(
                        userResult.userId,
                        result.schedule || [],
                        'today',
                        { date: date },
                        true // ВСЕГДА сохраняем в БД при обращении к парсеру
                    );

                    console.log('💾 Результат сохранения в БД:', {
                        savedToDatabase: saveResult.savedToDatabase,
                        scheduleCount: result.schedule?.length || 0
                    });

                } catch (dbError) {
                    console.error('❌ Ошибка сохранения расписания в БД:', dbError.message);
                    // НЕ прерываем выполнение - просто логируем ошибку
                }

                return Response.json({
                    success: true,
                    schedule: scheduleObj,
                    message: 'Расписание успешно получено'
                });

            } catch (dbError) {
                console.error('❌ Ошибка работы с БД:', dbError.message);
                return Response.json({
                    success: false,
                    message: `Ошибка работы с пользователем: ${dbError.message}`,
                    schedule: null
                }, { status: 500 });
            }
        } else {
            return Response.json({
                success: false,
                message: result.message || 'Ошибка получения расписания от парсера',
                schedule: null
            });
        }

    } catch (error) {
        console.error('❌ Schedule Update API Error:', error);

        return Response.json(
            {
                message: `❌ Ошибка обновления расписания: ${error.message}`,
                success: false,
                schedule: null
            },
            { status: 500 }
        );
    }
}