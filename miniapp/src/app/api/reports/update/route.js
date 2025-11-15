import { userService } from "@/services/user-service";
import { getAdminSupabase } from "../../../../../lib/supabase-client";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, uid } = await request.json();
        username = reqUsername;


        const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const result = await parserResponse.json();
        

        if (result.success && result.reports) {

            const userResult = await userService.createOrUpdateUser(username, password);

            const { reportsService } = await import('@/services/reports-service');
            
            const saveResult = await reportsService.saveUserReports(
                userResult.userId,
                result.reports
            );
            

            return Response.json({
                success: true,
                reports: result.reports,
                reports_count: result.reports.length,
                message: 'Отчеты успешно получены и сохранены в БД'
            });

        } else {
            return Response.json({
                success: false,
                message: result.message || 'Ошибка получения отчетов от парсера',
                reports: null
            });
        }

    } catch (error) {
        return Response.json(
            {
                message: `❌ Ошибка обновления отчетов: ${error.message}`,
                success: false,
                reports: null
            },
            { status: 500 }
        );
    }
}