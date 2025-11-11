"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientSupabase as supabase } from "./../../lib/supabase-client";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndInitialize();
  }, []);

  const checkAuthAndInitialize = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('❌ Нет активной сессии Supabase');
        router.push('/auth');
        return;
      }

      console.log('✅ Активная сессия Supabase найдена');
      
      // Проверяем сессию парсера
      const parserValid = await checkParserSession(session.user);
      
      if (parserValid) {
        console.log('✅ Сессия парсера активна, переход в /main');
        router.push('/main');
      } else {
        console.log('❌ Сессия парсера истекла, требуется переавторизация');
        // Выходим из Supabase и переходим на авторизацию
        await supabase.auth.signOut();
        router.push('/auth?expired=true');
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const checkParserSession = async (user) => {
    try {
      const username = user.user_metadata?.original_username || user.user_metadata?.username;
      
      if (!username) return false;

      const response = await fetch('http://localhost:3001/api/scrape/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.sessionActive;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

}