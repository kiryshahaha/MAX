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

        if (result.success && result.schedule) {
            try {
                const userResult = await userService.createOrUpdateUser(username, password);

                const scheduleObj = {
                    date: date,
                    date_dd_mm: `${String(new Date(date).getDate()).padStart(2, '0')}.${String(new Date(date).getMonth() + 1).padStart(2, '0')}`,
                    day_name: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(date).getDay()],
                    day_of_week: new Date(date).getDay(),
                    schedule: result.schedule || []
                };

                try {
                    const { scheduleService } = await import('@/services/schedule-service');
                    const saveResult = await scheduleService.saveUserSchedule(
                        userResult.userId,
                        result.schedule || [],
                        'today',
                        { date: date },
                        true 
                    );


                } catch (dbError) {
                }

                return Response.json({
                    success: true,
                    schedule: scheduleObj,
                    message: 'Расписание успешно получено'
                });

            } catch (dbError) {
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

        return Response.json(
            {
                message: `❌ Ошибка обновления расписания.`,
                success: false,
                schedule: null
            },
            { status: 500 }
        );
    }
}