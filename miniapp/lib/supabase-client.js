// lib/supabase-client.js
import { createClient } from '@supabase/supabase-js';

// Проверяем наличие обязательных переменных окружения
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

// Создаем клиент для клиентских операций (с RLS)
export const clientSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoConfirmEmail: true
    }
  }
);

// Функция для создания админ-клиента (только на сервере)
export const getAdminSupabase = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Admin Supabase client is only available on the server');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        autoConfirmEmail: true
      }
    }
  );
};

// НЕ экспортируем adminSupabase глобально - создаем только при вызове функции