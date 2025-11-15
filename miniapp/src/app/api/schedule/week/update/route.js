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


        const currentDate = new Date();
        const currentWeek = getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();


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

        if (!initData.success) {
            throw new Error(`Ошибка инициализации сессии: ${initData.message}`);
        }

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

        if (result.success && result.schedule) {
            try {
                const userResult = await userService.createOrUpdateUser(username, password);

                try {
                    const { scheduleService } = await import('@/services/schedule-service');
                    const saveResult = await scheduleService.saveUserSchedule(
                        userResult.userId,
                        result.schedule,
                        'week',
                        null,
                        true
                    );


                } catch (dbError) {
                }

                return Response.json({
                    success: true,
                    schedule: result.schedule,
                    message: 'Недельное расписание успешно получено',
                    week: currentWeek,
                    year: currentYear
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
                message: result.message || 'Ошибка получения недельного расписания от парсера',
                schedule: null
            });
        }

    } catch (error) {

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

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}