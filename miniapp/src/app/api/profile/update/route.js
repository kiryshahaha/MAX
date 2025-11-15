import { userService } from "@/services/user-service";
import { RetryHandler } from "../../utils/retry-handler";

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

export async function POST(request) {
    let username;

    try {
        const { username: reqUsername, password, uid } = await request.json();
        username = reqUsername;


        const parserResponse = await RetryHandler.withRetry(async () => {
            const response = await fetch(`${PARSER_SERVICE_URL}/api/scrape/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Parser service error: ${response.status} - ${errorText}`);
            }

            return response;
        }, 3, 1000);

        const result = await parserResponse.json();
        

        if (result.success && result.profile) {

            const userResult = await userService.createOrUpdateUser(username, password);

            const { profileService } = await import('@/services/profile-service');
            const saveResult = await profileService.saveUserProfile(
                userResult.userId,
                result.profile
            );
            

            return Response.json({
                success: true,
                profile: result.profile,
                message: 'Профиль успешно обновлен'
            });

        } else {
            return Response.json({
                success: false,
                message: result.message || 'Ошибка получения профиля от парсера',
                profile: null
            });
        }

    } catch (error) {
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