// import { userService } from "../../../services/user-service";
// import { tasksService } from "../../../services/tasks-service";
// import { logsService } from "../../../services/logs-service";
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

//     console.log('🔍 Получаем задачи от парсера для пользователя:', username);

//     const parserResponse = await fetch(`${PARSER_SERVICE_URL}/api/scrape/tasks`, {
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
//       tasksCount: result.tasks?.length 
//     });

//     if (result.success && result.tasks) {
//       try {
//         // Создание/обновление пользователя
//         const userResult = await userService.createOrUpdateUser(username, password);
//         console.log('👤 Результат создания пользователя:', { 
//           userId: userResult.userId
//         });
        
//         // Сохранение задач в user_data
//         const saveResult = await tasksService.saveUserTasks(userResult.userId, result.tasks);
//         console.log('💾 Результат сохранения задач:', saveResult);
        
//         // Проверяем, что данные действительно сохранились
//         if (saveResult) {
//           console.log('✅ Задачи успешно сохранены в БД');
          
//           // Дополнительная проверка: читаем обратно из БД
//           const { data: checkData, error: checkError } = await adminSupabase
//             .from('user_data')
//             .select('tasks, updated_at')
//             .eq('user_id', userResult.userId)
//             .single();
            
//           if (checkError) {
//             console.error('❌ Ошибка проверки сохраненных данных:', checkError);
//           } else {
//             console.log('✅ Проверка БД: сохранено задач:', checkData.tasks?.length);
//             console.log('✅ Время обновления:', checkData.updated_at);
//           }
//         }
        
//         // Логируем успешный вход
//         await logsService.logLogin(username, true, result.tasks.length, 'tasks');
//       } catch (dbError) {
//         console.error('❌ Ошибка работы с БД:', dbError.message);
//         // Добавляем информацию об ошибке БД в ответ
//         result.dbError = dbError.message;
//       }
//     } else {
//       await logsService.logLogin(username, false, 0, result.message, 'tasks');
//     }

//     return Response.json(result);

//   } catch (error) {
//     console.error('❌ Tasks API Error:', error);
    
//     if (username) {
//       await logsService.logLogin(username, false, 0, error.message, 'tasks');
//     }
    
//     return Response.json(
//       { 
//         message: `❌ Ошибка получения задач: ${error.message}`,
//         success: false,
//         tasks: []
//       },
//       { status: 500 }
//     );
//   }
// }