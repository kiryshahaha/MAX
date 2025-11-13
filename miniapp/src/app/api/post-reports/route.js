// import { userService } from "@/services/user-service";
// import { reportsService } from "@/services/reports-service";
// import { logsService } from "@/services/logs-service";
// import { adminSupabase } from "../../../../lib/supabase-client";

// const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL;

// export async function POST(request) {
//   let username;
  
//   try {
//     const { username: reqUsername, password } = await request.json();
//     username = reqUsername;

//     if (!username || !password) {
//       return Response.json({ 
//         message: '❌ Укажите логин и пароль',
//         success: false
//       }, { status: 400 });
//     }

//     console.log('🔍 Получаем отчеты от парсера для пользователя:', username);

//     const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/reports`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ username, password }),
//     });

//     if (!parserResponse.ok) {
//       const errorText = await parserResponse.text();
//       throw new Error(`Parser service error: ${parserResponse.status} - ${errorText}`);
//     }

//     const result = await parserResponse.json();
//     console.log('📊 Результат от парсера:', { 
//       success: result.success, 
//       reportsCount: result.reports?.length 
//     });

//     if (result.success && result.reports) {
//       try {
//         // Создание/обновление пользователя
//         const userResult = await userService.createOrUpdateUser(username, password);
//         console.log('👤 Результат создания пользователя:', { 
//           userId: userResult.userId
//         });
        
//         // Сохранение отчетов в user_data
//         const saveResult = await reportsService.saveUserReports(userResult.userId, result.reports);
//         console.log('💾 Результат сохранения отчетов:', saveResult);
        
//         // Проверяем, что данные действительно сохранились
//         if (saveResult) {
//           console.log('✅ Отчеты успешно сохранены в БД');
          
//           // Дополнительная проверка: читаем обратно из БД
//           const { data: checkData, error: checkError } = await adminSupabase
//             .from('user_data')
//             .select('reports, updated_at')
//             .eq('user_id', userResult.userId)
//             .single();
            
//           if (checkError) {
//             console.error('❌ Ошибка проверки сохраненных отчетов:', checkError);
//           } else {
//             console.log('✅ Проверка БД: сохранено отчетов:', checkData.reports?.length);
//             console.log('✅ Время обновления:', checkData.updated_at);
//           }
//         }
        
//         // Логируем успешный вход
//         await logsService.logLogin(username, true, result.reports.length, 'reports');
//       } catch (dbError) {
//         console.error('❌ Ошибка работы с БД:', dbError.message);
//         result.dbError = dbError.message;
//       }
//     } else {
//       await logsService.logLogin(username, false, 0, result.message, 'reports');
//     }

//     return Response.json(result);

//   } catch (error) {
//     console.error('❌ Reports API Error:', error);
    
//     if (username) {
//       await logsService.logLogin(username, false, 0, error.message, 'reports');
//     }
    
//     return Response.json(
//       { 
//         message: `❌ Ошибка получения отчетов: ${error.message}`,
//         success: false,
//         reports: []
//       },
//       { status: 500 }
//     );
//   }
// }