"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientSupabase as supabase } from "./../../lib/supabase-client";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Активная сессия найдена, перенаправляем на главную');
        router.replace('/main');
      } else {
        console.log('❌ Нет активной сессии, перенаправляем на авторизацию');
        router.replace('/auth');
      }
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      router.replace('/auth');
    } finally {
      setLoading(false);
    }
  };


  // const checkRefreshToken = async () => {
  //   try {
  //     // Проверяем валидность refresh токена через Supabase
  //     const { data: { session } } = await supabase.auth.getSession();
  //     return !!session;
  //   } catch (error) {
  //     return false;
  //   }
  // };

  // const checkAndInitParserSession = async (user, password) => {
  //   try {
  //     const username = user.user_metadata?.original_username || user.user_metadata?.username;
      
  //     if (!username) return false;

  //     // Сначала проверяем существующую сессию
  //     const sessionActive = await checkParserSession(username);
      
  //     if (sessionActive) {
  //       console.log('✅ Используется существующая сессия парсера');
  //       return true;
  //     }

  //     // Если сессии нет - инициализируем новую с паролем из localStorage
  //     console.log('🔄 Инициализация новой сессии парсера');
  //     return await initializeParserSession(username, password);

  //   } catch (error) {
  //     console.error('Parser session error:', error);
  //     return false;
  //   }
  // };

  // const checkParserSession = async (username) => {
  //   try {

  //      const parserServiceUrl = process.env.PARSER_SERVICE_URL;

  //      const response = await fetch(`${parserServiceUrl}/api/scrape/check-session`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ username }),
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       return result.sessionActive;
  //     }
  //     return false;
  //   } catch (error) {
  //     return false;
  //   }
  // };

  // const initializeParserSession = async (username, password) => {
  //   try {

  //     const parserServiceUrl = process.env.PARSER_SERVICE_URL;

  //     const response = await fetch(`${parserServiceUrl}/api/scrape/init-session`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ username, password }),
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       return result.success && result.sessionActive;
  //     }
  //     return false;
  //   } catch (error) {
  //     return false;
  //   }
  // };

  return null;
}