// app/api/profile/update/route.js
import { userService } from "@/services/user-service";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || "http://127.0.0.1:8000";

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, uid } = await request.json();
        username = reqUsername;

        console.log('🔍 ДИАГНОСТИКА - Начало обновления профиля:', {
            username,
            uid,
            passwordExists: !!password
        });

        // Запрашиваем обновление профиля через парсер
        const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const result = await parserResponse.json();
        
        console.log('🔍 ДИАГНОСТИКА - Ответ от парсера (профиль):', {
            success: result.success,
            profile: result.profile ? 'получен' : 'отсутствует',
            message: result.message
        });

        if (result.success && result.profile) {
            console.log('✅ Профиль получен от парсера, сохраняем в БД');

            // Создаем или обновляем пользователя
            const userResult = await userService.createOrUpdateUser(username, password);
            console.log('👤 Пользователь создан/обновлен:', {
                userId: userResult.userId
            });

            // Сохраняем профиль
            const { profileService } = await import('@/services/profile-service');
            const saveResult = await profileService.saveUserProfile(
                userResult.userId,
                result.profile
            );
            
            console.log('💾 Результат сохранения профиля:', {
                success: !!saveResult
            });

            return Response.json({
                success: true,
                profile: result.profile,
                message: 'Профиль успешно обновлен'
            });

        } else {
            console.error('❌ Парсер вернул ошибку:', result);
            return Response.json({
                success: false,
                message: result.message || 'Ошибка получения профиля от парсера',
                profile: null
            });
        }

    } catch (error) {
        console.error('❌ Ошибка в profile/update:', error);
        return Response.json(
            {
                message: `❌ Ошибка обновления профиля: ${error.message}`,
                success: false,
                profile: null
            },
            { status: 500 }
        );
    }
}