"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, Input, Panel, Typography } from "@maxhub/max-ui";
import { Lock, Mail } from "lucide-react";
import Image from "next/image";
import { message } from "antd";
import { clientSupabase as supabase } from "../../../lib/supabase-client";

const { Label } = Typography;

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const [msg, contextHolder] = message.useMessage();

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Пользователь уже авторизован, перенаправляем на главную');
        router.replace('/main');
        return;
      }
      
      // Если сессии нет, остаемся на странице авторизации
      setAuthChecked(true);
      
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthChecked(true);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const login = e.target.login.value.trim();
    const password = e.target.password.value.trim();

    if (!login || !password) {
      msg.error("Заполните все поля");
      setLoading(false);
      return;
    }

    try {
      // 1. Проверяем креды через парсер
      const parserSuccess = await initializeParserSession(login, password);
      
      if (!parserSuccess) {
        msg.error("Неверный логин или пароль ЛК ГУАП");
        setLoading(false);
        return;
      }

      // 2. Сохраняем пароль в localStorage
      localStorage.setItem('guap_password', password);

      const email = isValidEmail(login) ? login : `${login}@guap-temp.com`;

      // 3. Создаем/входим в Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: password
      });

      if (signInError) {
        // Если пользователя нет - регистрируем
        if (signInError.message?.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: password,
            options: {
              data: {
                original_username: login,
                username: login,
                last_login: new Date().toISOString(),
              }
            }
          });

          if (signUpError) throw signUpError;
        } else {
          throw signInError;
        }
      }

      // 4. Успешная авторизация
      msg.success("Успешный вход!");
      router.replace('/main');

    } catch (error) {
      console.error('Login error:', error);
      // При ошибке очищаем пароль из localStorage
      localStorage.removeItem('guap_password');
      msg.error(error.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  const initializeParserSession = async (username, password) => {
    try {
      const response = await fetch('http://localhost:3001/api/scrape/init-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        console.warn('Парсер-сервис недоступен');
        return false;
      }

      const result = await response.json();
      
      if (result.success && result.sessionActive) {
        console.log('✅ Сессия парсера инициализирована');
        return true;
      } else {
        console.warn('❌ Ошибка инициализации сессии парсера:', result.message);
        return false;
      }

    } catch (error) {
      console.warn('Ошибка инициализации сессии парсера:', error.message);
      return false;
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Если проверка авторизации еще не завершена, показываем загрузку
  if (!authChecked) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Проверка авторизации...
      </div>
    );
  }

  // Если проверка завершена и пользователь не авторизован, показываем форму входа
  return (
    <Panel mode="secondary">
      {contextHolder}
      <form onSubmit={handleLogin}>
        <Flex
          direction="column"
          gap={20}
          justify="center"
          align="center"
          className="wrap"
        >
          <Image src="/MAI.svg" alt="Логотип МАИ" width={100} height={100} />
          <Label
            variant="custom"
            style={{
              fontSize: "1.5rem",
              fontVariantCaps: "all-small-caps",
              fontWeight: "bold",
            }}
          >
            Войдите в ЛК ГУАП
          </Label>
          <Input
            name="login"
            defaultValue=""
            mode="primary"
            placeholder="Логин ГУАП"
            iconBefore={<Mail></Mail>}
            disabled={loading}
          />
          <Input
            mode="primary"
            name="password"
            type="password"
            defaultValue=""
            placeholder="Пароль ГУАП"
            iconBefore={<Lock></Lock>}
            disabled={loading}
          />
          <Button type="submit" loading={loading}>
            Войти
          </Button>
        </Flex>
      </form>
    </Panel>
  );
}