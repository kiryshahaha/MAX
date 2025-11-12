// app/api/reports/update/route.js
import { userService } from "@/services/user-service";
import { getAdminSupabase } from "../../../../../lib/supabase-client";

// ✅ ДОБАВЬТЕ ЭТУ СТРОКУ:
const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || "http://127.0.0.1:8000";

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, uid } = await request.json();
        username = reqUsername;

        console.log('🔍 ДИАГНОСТИКА - Начало обработки отчетов:', {
            username,
            uid,
            passwordExists: !!password
        });

        const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const result = await parserResponse.json();
        
        // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ
        console.log('🔍 ДИАГНОСТИКА - Ответ от парсера:', {
            success: result.success,
            reportsCount: result.reports?.length,
            reports: result.reports, // ВСЕ отчеты
            message: result.message,
            status: parserResponse.status
        });

        if (result.success && result.reports) {
            console.log('🔍 ДИАГНОСТИКА - Сохраняем отчеты в БД:', {
                reportsCount: result.reports.length,
                firstReport: result.reports[0] // пример первого отчета
            });

            const userResult = await userService.createOrUpdateUser(username, password);
            console.log('🔍 ДИАГНОСТИКА - Пользователь создан:', {
                userId: userResult.userId
            });

            // Динамический импорт
            const { reportsService } = await import('@/services/reports-service');
            
            console.log('🔍 ДИАГНОСТИКА - Вызов reportsService.saveUserReports...');
            const saveResult = await reportsService.saveUserReports(
                userResult.userId,
                result.reports
            );
            
            console.log('🔍 ДИАГНОСТИКА - Результат сохранения:', {
                saveResult,
                saveResultLength: saveResult?.length,
                type: typeof saveResult
            });

            return Response.json({
                success: true,
                reports: result.reports,
                reports_count: result.reports.length,
                message: 'Отчеты успешно получены и сохранены в БД'
            });

        } else {
            console.error('❌ ДИАГНОСТИКА - Парсер вернул ошибку:', result);
            return Response.json({
                success: false,
                message: result.message || 'Ошибка получения отчетов от парсера',
                reports: null
            });
        }

    } catch (error) {
        console.error('❌ ДИАГНОСТИКА - Ошибка в reports/update:', error);
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