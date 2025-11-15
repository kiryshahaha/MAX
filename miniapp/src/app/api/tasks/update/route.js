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

        if (result.success && result.tasks) {
            try {
                const userResult = await userService.createOrUpdateUser(username, password);
                console.log('👤 Результат создания пользователя:', {
                    userId: userResult.userId
                });

                const tasksObj = {
                    tasks: result.tasks || [],
                    tasks_count: result.tasks?.length || 0
                };

                try {
                    const { tasksService } = await import('@/services/tasks-service');
                    const saveResult = await tasksService.saveUserTasks(
                        userResult.userId,
                        result.tasks || []
                    );


                } catch (dbError) {
                }

                return Response.json({
                    success: true,
                    tasks: result.tasks || [],
                    tasks_count: result.tasks?.length || 0,
                    message: 'Задачи успешно получены и сохранены в БД'
                });

            } catch (dbError) {
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