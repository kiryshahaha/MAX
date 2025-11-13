// app/api/schedule/week/update/route.js
import { userService } from "@/services/user-service";
import { getAdminSupabase } from "../../../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, uid } = await request.json();
        username = reqUsername;

        if (!username || !password || !uid) {
            return Response.json({
                message: '❌ Укажите логин, пароль и UID',
                success: false
            }, { status: 400 });
        }

        console.log('🚀 Запрашиваем недельное расписание у парсера:', { username, uid });

        // Получаем текущую дату и номер недели
        const currentDate = new Date();
        const currentWeek = getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();

        console.log('📅 Получаем расписание на текущую неделю:', { 
            year: currentYear, 
            week: currentWeek 
        });

        // Шаг 1: Инициализация сессии
        console.log('🔐 Инициализация сессии парсера...');
        const initResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/init-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username, 
                password
            }),
        });

        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            throw new Error(`Session init error: ${initResponse.status} - ${errorText}`);
        }

        const initData = await initResponse.json();
        console.log('🔐 Результат инициализации сессии:', initData);

        if (!initData.success) {
            throw new Error(`Ошибка инициализации сессии: ${initData.message}`);
        }

        // Шаг 2: Получение недельного расписания
        console.log('📅 Запрос недельного расписания...');
        const scheduleResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                username, 
                password, 
                year: currentYear,
                week: currentWeek
            }),
        });

        if (!scheduleResponse.ok) {
            const errorText = await scheduleResponse.text();
            throw new Error(`Parser service error: ${scheduleResponse.status} - ${errorText}`);
        }

        const result = await scheduleResponse.json();
        console.log('📊 Результат от парсера (week):', {
            success: result.success,
            hasSchedule: !!result.schedule,
            daysCount: result.schedule?.days?.length,
            extraClassesCount: result.schedule?.extraClasses?.length,
            message: result.message
        });

        if (result.success && result.schedule) {
            try {
                // Создание/обновление пользователя
                const userResult = await userService.createOrUpdateUser(username, password);
                console.log('👤 Результат создания пользователя:', {
                    userId: userResult.userId
                });

                try {
                    // Сохраняем недельное расписание в БД
                    const { scheduleService } = await import('@/services/schedule-service');
                    const saveResult = await scheduleService.saveUserSchedule(
                        userResult.userId,
                        result.schedule,
                        'week',
                        null,
                        true
                    );

                    console.log('💾 Результат сохранения недельного расписания в БД:', {
                        savedToDatabase: saveResult.savedToDatabase,
                        daysCount: result.schedule?.days?.length || 0,
                        weekNumber: currentWeek,
                        year: currentYear
                    });

                } catch (dbError) {
                    console.error('❌ Ошибка сохранения недельного расписания в БД:', dbError.message);
                    // НЕ прерываем выполнение - просто логируем ошибку
                }

                return Response.json({
                    success: true,
                    schedule: result.schedule,
                    message: 'Недельное расписание успешно получено',
                    week: currentWeek,
                    year: currentYear
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
                message: result.message || 'Ошибка получения недельного расписания от парсера',
                schedule: null
            });
        }

    } catch (error) {
        console.error('❌ Week Schedule Update API Error:', error);

        return Response.json(
            {
                message: `❌ Ошибка обновления недельного расписания: ${error.message}`,
                success: false,
                schedule: null
            },
            { status: 500 }
        );
    }
}

// Функция для получения номера недели (ISO 8601)
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}