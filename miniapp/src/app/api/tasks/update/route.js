// app/api/tasks/update/route.js
import { userService } from "@/services/user-service";
import { getAdminSupabase } from "../../../../../lib/supabase-client";

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

        console.log('🚀 Запрашиваем задачи у парсера:', { username, uid });

        const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/tasks`, {
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
        console.log('📊 Результат от парсера (задачи):', {
            success: result.success,
            tasksCount: result.tasks?.length
        });

        if (result.success && result.tasks) {
            try {
                // Создание/обновление пользователя
                const userResult = await userService.createOrUpdateUser(username, password);
                console.log('👤 Результат создания пользователя:', {
                    userId: userResult.userId
                });

                // Формируем объект задач
                const tasksObj = {
                    tasks: result.tasks || [],
                    tasks_count: result.tasks?.length || 0
                };

                try {
                    // ✅ ИСПРАВЛЕНО: Используем динамический импорт как в schedule
                    const { tasksService } = await import('@/services/tasks-service');
                    const saveResult = await tasksService.saveUserTasks(
                        userResult.userId,
                        result.tasks || []
                    );

                    console.log('💾 Результат сохранения задач в БД:', {
                        success: !!saveResult,
                        tasksCount: result.tasks?.length || 0,
                        savedTasks: saveResult?.length || 0
                    });

                } catch (dbError) {
                    console.error('❌ Ошибка сохранения задач в БД:', dbError.message);
                    // НЕ прерываем выполнение - просто логируем ошибку
                }

                return Response.json({
                    success: true,
                    tasks: result.tasks || [],
                    tasks_count: result.tasks?.length || 0,
                    message: 'Задачи успешно получены и сохранены в БД'
                });

            } catch (dbError) {
                console.error('❌ Ошибка работы с БД:', dbError.message);
                return Response.json({
                    success: false,
                    message: `Ошибка работы с пользователем: ${dbError.message}`,
                    tasks: null
                }, { status: 500 });
            }
        } else {
            return Response.json({
                success: false,
                message: result.message || 'Ошибка получения задач от парсера',
                tasks: null
            });
        }

    } catch (error) {
        console.error('❌ Tasks Update API Error:', error);

        return Response.json(
            {
                message: `❌ Ошибка обновления задач: ${error.message}`,
                success: false,
                tasks: null
            },
            { status: 500 }
        );
    }
}