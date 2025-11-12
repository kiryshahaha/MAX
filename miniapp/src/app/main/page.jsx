"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Button, 
  CellHeader, 
  CellList, 
  CellSimple, 
  Container, 
  Dot, 
  EllipsisText, 
  Flex, 
  Panel, 
  Spinner
} from "@maxhub/max-ui";
import { Badge, Divider, Steps, Tag, message } from "antd";
import { clientSupabase as supabase } from "../../../lib/supabase-client";

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [fetchLock, setFetchLock] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

const checkAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.log('❌ Нет активной сессии');
      router.push('/auth');
      return;
    }

    setUser(session.user);
    
    // Передаем ID пользователя явно
    await fetchTodaySchedule(session.user.id);

  } catch (error) {
    console.error('Auth check error:', error);
    messageApi.error('Ошибка авторизации');
    router.push('/auth');
  } finally {
    setLoading(false);
  }
};

  const calculateActivePairProgress = (schedule) => {
  if (!schedule || !schedule.schedule) return undefined;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const classItem of schedule.schedule) {
    if (classItem.timeRange) {
      const [startTime, endTime] = classItem.timeRange.split('-');
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        const totalDuration = endMinutes - startMinutes;
        const elapsed = currentTime - startMinutes;
        return Math.min(Math.round((elapsed / totalDuration) * 100), 100);
      }
    }
  }
  
  return undefined; // нет активной пары
};

const fetchTodaySchedule = async (userId) => {
  try {
    setScheduleLoading(true);
    console.log('📅 Запрашиваем расписание для пользователя:', userId);

    // 1. Сначала проверяем бэкенд
    const backendResponse = await fetch(`http://127.0.0.1:8000/schedule/today?uid=${userId}`);
    
    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    console.log('📊 Ответ от бэкенда:', backendData);

    const currentDate = new Date().toISOString().split('T')[0];

    // 2. Проверяем наличие расписания и его содержимое
    const hasValidSchedule = backendData.success && 
                            backendData.schedule && 
                            backendData.schedule.date === currentDate &&
                            Array.isArray(backendData.schedule.schedule) &&
                            backendData.schedule.schedule.length > 0; // Ключевое изменение - проверяем что массив не пустой

    console.log('🔍 Детальная проверка данных:', {
      success: backendData.success,
      hasSchedule: !!backendData.schedule,
      scheduleDate: backendData.schedule?.date,
      currentDate,
      hasScheduleArray: Array.isArray(backendData.schedule?.schedule),
      scheduleLength: backendData.schedule?.schedule?.length,
      hasValidSchedule
    });

    // 3. Если расписание есть и оно не пустое - используем его, иначе обращаемся к парсеру
    if (hasValidSchedule) {
      console.log('✅ Используем актуальное расписание из бэкенда');
      setTodaySchedule(backendData.schedule);
    } else {
      console.log('🔄 Обращаемся к парсеру - расписание отсутствует или пустое');
      await fetchFromParser(userId, currentDate);
    }

  } catch (error) {
    console.error('❌ Ошибка получения расписания:', error);
    messageApi.error('Ошибка загрузки расписания');
  } finally {
    setScheduleLoading(false);
  }
};

 const fetchFromParser = async (userId, currentDate) => {

    if (fetchLock) {
    console.log('⏳ Запрос уже выполняется, ждем...');
    return;
  }

  try {
setFetchLock(true);
    // Получаем актуальные данные пользователя из сессии
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      messageApi.error('Сессия не найдена');
      return;
    }

    const guapUsername = session.user.user_metadata?.guap_username || 
                        session.user.user_metadata?.original_username || 
                        session.user.user_metadata?.username;
    const password = localStorage.getItem('guap_password');

    console.log('🔐 Данные для парсера:', { 
      guapUsername, 
      passwordExists: !!password,
      userId 
    });

    // ИСПРАВЛЕНИЕ: используем guapUsername вместо username
    if (!guapUsername || !password) {
      console.error('❌ Отсутствуют данные для авторизации:', { 
        guapUsername, 
        passwordExists: !!password 
      });
      messageApi.error('Данные для авторизации не найдены');
      return;
    }

    console.log('🚀 Отправляем запрос к парсеру:', { 
      username: guapUsername, // ИСПРАВЛЕНИЕ: используем guapUsername
      date: currentDate 
    });

    const parserResponse = await fetch('/api/post-daily-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: guapUsername, // ИСПРАВЛЕНИЕ: используем guapUsername
        password,
        date: currentDate,
        saveToDatabase: true
      }),
    });

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text();
      throw new Error(`Parser error: ${parserResponse.status} - ${errorText}`);
    }

    const parserData = await parserResponse.json();
    console.log('📊 Ответ от парсера:', parserData);

    if (parserData.success) {
      // Создаем объект расписания в формате бэкенда
      const scheduleObj = {
        date: currentDate,
        date_dd_mm: `${String(new Date().getDate()).padStart(2, '0')}.${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        day_name: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date().getDay()],
        day_of_week: new Date().getDay(),
        schedule: parserData.schedule || []
      };

      setTodaySchedule(scheduleObj);
      messageApi.success('Расписание обновлено');
    } else {
      messageApi.error(parserData.message || 'Ошибка получения расписания');
    }

  } catch (error) {
    console.error('❌ Ошибка парсера:', error);
    messageApi.error('Ошибка обновления расписания');
  } finally {
    setFetchLock(false);
  }
};

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const username = session.user.user_metadata?.original_username || session.user.user_metadata?.username;
        
        if (username) {
          await fetch('http://localhost:3001/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          });
        }
      }

      await supabase.auth.signOut();
      localStorage.removeItem('guap_password');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      messageApi.error('Ошибка при выходе');
    }
  };

const formatScheduleForSteps = (schedule) => {
  if (!schedule || !schedule.schedule || schedule.schedule.length === 0) return [];

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  return schedule.schedule.map((classItem, index) => {
    let status = "wait";
    let percent = undefined;

    if (classItem.timeRange) {
      const [startTime, endTime] = classItem.timeRange.split('-');
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (currentTime < startMinutes) {
        status = "wait";
      } else if (currentTime >= startMinutes && currentTime <= endMinutes) {
        status = "process";
        const totalDuration = endMinutes - startMinutes;
        const elapsed = currentTime - startMinutes;
        percent = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
      } else {
        status = "finish";
      }
    }

    return {
      title: classItem.subject || 'Не указано',
      description: `${classItem.timeRange || ''}${classItem.building ? `, ${classItem.building}` : ''}${classItem.location ? `, ${classItem.location}` : ''}`,
      subTitle: classItem.pairNumber || '',
      status,
      percent // передаем percent в каждый step
    };
  });
};

  return (
    <Panel mode="secondary" className="wrap">
      {contextHolder}
      <Flex direction="column" align="stretch" gap={5}>
        <Container>
          <Flex justify="end" style={{ marginBottom: '10px' }}>
            <Button onClick={handleLogout}>Выйти</Button>
          </Flex>

          {/* Расписание на сегодня */}
          <CellList
            filled
            mode="island"
            header={
              <CellHeader
                titleStyle="caps"
                after={<Dot appearance="accent-red"></Dot>}
              >
                Расписание на сегодня {todaySchedule?.date_dd_mm}
              </CellHeader>
            }
          >
            {scheduleLoading ? (
              <CellSimple><Spinner /></CellSimple>
            ) : todaySchedule && todaySchedule.schedule.length > 0 ? (
              <CellSimple
              showChevron
              >
                <Steps
                  direction="vertical"
                  items={formatScheduleForSteps(todaySchedule)}
                  percent={calculateActivePairProgress(todaySchedule)}
                  
                />
              </CellSimple>
            ) : (
              <CellSimple>
                На сегодня занятий нет
                <Button 
                  type="link" 
                  onClick={() => fetchTodaySchedule(user?.id)}
                  style={{ marginTop: '10px' }}
                >
                  Обновить
                </Button>
              </CellSimple>
            )}
          </CellList>
        </Container>

        <Divider></Divider>

        <Divider></Divider>

        <Container>
          <CellList
            filled
            mode="island"
            header={
              <CellHeader titleStyle="caps">Ближайшие дедлайны</CellHeader>
            }
          >
            <CellSimple
              after={<Tag color="error">{"19.08"}</Tag>}
              title="Основы программирования"
              subtitle="ЛР №5. «Множественное наследование в языке С++»"
            ></CellSimple>
            <CellSimple
              after={<Tag color="warning">{11.11}</Tag>}
              title="Основы программирования"
              subtitle="ЛР №5Д. «Виртуальные функции и абстрактные классы»"
            ></CellSimple>
            <CellSimple
              after={<Tag color="success">{14.12}</Tag>}
              title="Основы программирования"
              subtitle="ЛР №5Д. «Виртуальные функции и абстрактные классы»"
            ></CellSimple>
          </CellList>
        </Container>

        <Divider></Divider>

        <Container>
          <CellList
            filled
            mode="island"
            header={<CellHeader titleStyle="caps">Уведомления</CellHeader>}
          >
            <CellSimple
              title="Алгоритмы и структуры данных"
              after={<Badge status="error"></Badge>}
              subtitle={
                <a
                  href="https://pro.guap.ru/inside/student/tasks/168453"
                  rel="noreferrer"
                  target="_blank"
                >
                  <EllipsisText maxLines={1}>
                    ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
                  </EllipsisText>
                </a>
              }
            ></CellSimple>
            <CellSimple
              title="Алгоритмы и структуры данных"
              after={<Badge status="warning"></Badge>}
              subtitle={
                <a
                  href="https://pro.guap.ru/inside/student/tasks/168453"
                  rel="noreferrer"
                  target="_blank"
                >
                  <EllipsisText maxLines={1}>
                    ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
                  </EllipsisText>
                </a>
              }
            ></CellSimple>
            <CellSimple
              title="Алгоритмы и структуры данных"
              after={<Badge status="warning"></Badge>}
              subtitle={
                <a
                  href="https://pro.guap.ru/inside/student/tasks/168453"
                  rel="noreferrer"
                  target="_blank"
                >
                  <EllipsisText maxLines={1}>
                    ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
                  </EllipsisText>
                </a>
              }
            ></CellSimple>
          </CellList>
        </Container>
      </Flex>
    </Panel>
  );
}
