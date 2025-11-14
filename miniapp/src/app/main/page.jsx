"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Container,
  Flex,
  Panel,
  Spinner
} from "@maxhub/max-ui";
import { Divider, message } from "antd";
import { clientSupabase as supabase } from "../../../lib/supabase-client";

// Импортируем компоненты
import ScheduleSection from "@/components/ScheduleSection";
import DeadlinesSection from "@/components/DeadlinesSection";
import ReportsSection from "@/components/ReportsSection";
import PsychologistBooking from "../PsychologistBooking/PsychologistBooking";
import NotificationsSection from "@/components/NotificationsSection";

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [fetchLock, setFetchLock] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksFetchLock, setTasksFetchLock] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFetchLock, setReportsFetchLock] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Состояния для отслеживания прогресса первоначальной загрузки
  const [initialLoadProgress, setInitialLoadProgress] = useState({
    schedule: false,
    tasks: false,
    reports: false
  });

  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('❌ Нет активной сессии, перенаправляем на авторизацию');
        router.replace('/auth');
        return;
      }

      setUser(session.user);
      setAuthChecked(true);

      setInitialLoadProgress({
        schedule: false,
        tasks: false,
        reports: false
      });

      console.log('🔄 Последовательная загрузка данных...');

      // 1. Расписание
      await fetchTodaySchedule(session.user.id, true);
      await new Promise(resolve => setTimeout(resolve, 500)); // небольшая пауза

      // 2. Задачи
      await fetchTasks(session.user.id, false, true);
      await new Promise(resolve => setTimeout(resolve, 500)); // небольшая пауза

      // 3. Отчеты
      await fetchReports(session.user.id, false, true);

      console.log('✅ Все данные загружены последовательно');

    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (userId, forceUpdate = false, isInitialLoad = false) => {
    if (reportsLoading && !isInitialLoad) {
      console.log('⏳ Запрос отчетов уже выполняется...');
      return;
    }

    try {
      if (!isInitialLoad) {
        setReportsLoading(true);
      }

      console.log('📋 Запрашиваем отчеты для пользователя:', userId, { forceUpdate });

      if (forceUpdate) {
        console.log('🔄 Принудительное обновление через парсер');
        await updateReportsFromParser(userId, isInitialLoad);
        return;
      }

      const reportsResponse = await fetch(`/api/reports?uid=${userId}`);

      if (!reportsResponse.ok) {
        throw new Error(`Reports API error: ${reportsResponse.status}`);
      }

      const reportsData = await reportsResponse.json();
      console.log('📊 Ответ от reports API:', reportsData);

      // Исправленная логика проверки источника данных
      if (reportsData.success && reportsData.reports && reportsData.reports_count > 0) {
        if (reportsData.source === 'supabase') {
          console.log('✅ Используем актуальные отчеты из Supabase');
        } else if (reportsData.source === 'parser') {
          console.log('🔄 Используем обновленные отчеты из парсера');
        } else {
          console.log('✅ Используем отчеты из API');
        }

        setReports(reportsData.reports);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, reports: true }));
        }
      } else {
        console.log('🔄 Отчеты не найдены в БД, обновляем через парсер');
        await updateReportsFromParser(userId, isInitialLoad);
      }

    } catch (error) {
      console.error('❌ Ошибка получения отчетов:', error);
      if (!isInitialLoad) {
        messageApi.error('Ошибка загрузки отчетов');
      }
    } finally {
      if (!isInitialLoad) {
        setReportsLoading(false);
      }
    }
  };

  const updateReportsFromParser = async (userId, isInitialLoad = false) => {
    if (reportsFetchLock && !isInitialLoad) {
      console.log('⏳ Запрос отчетов уже выполняется, ждем...');
      return;
    }

    try {
      if (!isInitialLoad) {
        setReportsFetchLock(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!isInitialLoad) messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        if (!isInitialLoad) messageApi.error('Данные для авторизации не найдены');
        return;
      }

      console.log('🚀 Отправляем запрос на обновление отчетов');
      const updateResponse = await fetch('/api/reports/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: guapUsername,
          password,
          uid: userId
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Update reports API error: ${updateResponse.status} - ${errorText}`);
      }

      const updateData = await updateResponse.json();
      console.log('📊 Ответ от update reports API:', updateData);

      if (updateData.success) {
        setReports(updateData.reports || []);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, reports: true }));
        }
        if (!isInitialLoad) {
          messageApi.success('Отчеты обновлены');
        }
      } else {
        if (!isInitialLoad) {
          messageApi.error(updateData.message || 'Ошибка обновления отчетов');
        }
      }

    } catch (error) {
      console.error('❌ Ошибка обновления отчетов:', error);
      if (!isInitialLoad) {
        messageApi.error('Ошибка обновления отчетов');
      }
    } finally {
      if (!isInitialLoad) {
        setReportsFetchLock(false);
      }
    }
  };

  const fetchTodaySchedule = async (userId, isInitialLoad = false) => {
    if (scheduleLoading && !isInitialLoad) {
      console.log('⏳ Запрос расписания уже выполняется...');
      return;
    }

    try {
      if (!isInitialLoad) {
        setScheduleLoading(true);
      }

      console.log('📅 Запрашиваем расписание для пользователя:', userId);

      const scheduleResponse = await fetch(`/api/schedule/today?uid=${userId}`);

      if (!scheduleResponse.ok) {
        throw new Error(`Schedule API error: ${scheduleResponse.status}`);
      }

      const scheduleData = await scheduleResponse.json();
      console.log('📊 Ответ от schedule API:', scheduleData);

      const shouldUpdateFromParser = !scheduleData.success ||
        scheduleData.needsUpdate ||
        (scheduleData.schedule && scheduleData.schedule.has_schedule === false);

      if (scheduleData.success && scheduleData.schedule && !shouldUpdateFromParser) {
        console.log('✅ Используем актуальное расписание из бэкенда');
        setTodaySchedule(scheduleData.schedule);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, schedule: true }));
        }
      } else {
        console.log('🔄 Расписание не найдено, устарело или дата не совпадает, обновляем через парсер');
        await updateScheduleFromParser(userId, isInitialLoad);
      }

    } catch (error) {
      console.error('❌ Ошибка получения расписания:', error);
      if (!isInitialLoad) {
        messageApi.error('Ошибка загрузки расписания');
      }
    } finally {
      if (!isInitialLoad) {
        setScheduleLoading(false);
      }
    }
  };

  const updateScheduleFromParser = async (userId, isInitialLoad = false) => {
    if (fetchLock && !isInitialLoad) {
      console.log('⏳ Запрос уже выполняется, ждем...');
      return;
    }

    try {
      if (!isInitialLoad) {
        setFetchLock(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!isInitialLoad) messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');
      const currentDate = new Date();
      const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        if (!isInitialLoad) messageApi.error('Данные для авторизации не найдены');
        return;
      }

      console.log('🚀 Отправляем запрос на обновление расписания');
      const updateResponse = await fetch('/api/schedule/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: guapUsername,
          password,
          date: currentDateString
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Update API error: ${updateResponse.status} - ${errorText}`);
      }

      const updateData = await updateResponse.json();
      console.log('📊 Ответ от update API:', updateData);

      if (updateData.success) {
        setTodaySchedule(updateData.schedule);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, schedule: true }));
        }
        if (!isInitialLoad) {
          messageApi.success('Расписание обновлено');
        }
      } else {
        if (!isInitialLoad) {
          messageApi.error(updateData.message || 'Ошибка обновления расписания');
        }
      }

    } catch (error) {
      console.error('❌ Ошибка обновления расписания:', error);
      if (!isInitialLoad) {
        messageApi.error('Ошибка обновления расписания');
      }
    } finally {
      if (!isInitialLoad) {
        setFetchLock(false);
      }
    }
  };

  const fetchTasks = async (userId, forceUpdate = false, isInitialLoad = false) => {
    if (tasksLoading && !isInitialLoad) {
      console.log('⏳ Запрос задач уже выполняется...');
      return;
    }

    try {
      if (!isInitialLoad) {
        setTasksLoading(true);
      }

      console.log('📝 Запрашиваем задачи для пользователя:', userId, { forceUpdate });

      if (forceUpdate) {
        console.log('🔄 Принудительное обновление через парсер');
        await updateTasksFromParser(userId, isInitialLoad);
        return;
      }

      const tasksResponse = await fetch(`/api/tasks?uid=${userId}`);

      if (!tasksResponse.ok) {
        throw new Error(`Tasks API error: ${tasksResponse.status}`);
      }

      const tasksData = await tasksResponse.json();
      console.log('📊 Ответ от tasks API:', tasksData);

      // Исправленная логика проверки источника данных
      if (tasksData.success && tasksData.tasks && tasksData.tasks_count > 0) {
        if (tasksData.source === 'supabase') {
          console.log('✅ Используем актуальные задачи из Supabase');
        } else if (tasksData.source === 'parser') {
          console.log('🔄 Используем обновленные задачи из парсера');
        } else {
          console.log('✅ Используем задачи из API');
        }

        setTasks(tasksData.tasks);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, tasks: true }));
        }
      } else {
        console.log('🔄 Задачи не найдены в БД, обновляем через парсер');
        await updateTasksFromParser(userId, isInitialLoad);
      }

    } catch (error) {
      console.error('❌ Ошибка получения задач:', error);
      if (!isInitialLoad) {
        messageApi.error('Ошибка загрузки задач');
      }
    } finally {
      if (!isInitialLoad) {
        setTasksLoading(false);
      }
    }
  };

  const updateTasksFromParser = async (userId, isInitialLoad = false) => {
    if (tasksFetchLock && !isInitialLoad) {
      console.log('⏳ Запрос задач уже выполняется, ждем...');
      return;
    }

    try {
      if (!isInitialLoad) {
        setTasksFetchLock(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!isInitialLoad) messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        if (!isInitialLoad) messageApi.error('Данные для авторизации не найдены');
        return;
      }

      console.log('🚀 Отправляем запрос на обновление задач');
      const updateResponse = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: guapUsername,
          password,
          uid: userId
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Update tasks API error: ${updateResponse.status} - ${errorText}`);
      }

      const updateData = await updateResponse.json();
      console.log('📊 Ответ от update tasks API:', updateData);

      if (updateData.success) {
        setTasks(updateData.tasks || []);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, tasks: true }));
        }
        if (!isInitialLoad) {
          messageApi.success('Задачи обновлены');
        }
      } else {
        if (!isInitialLoad) {
          messageApi.error(updateData.message || 'Ошибка обновления задач');
        }
      }

    } catch (error) {
      console.error('❌ Ошибка обновления задач:', error);
      if (!isInitialLoad) {
        messageApi.error('Ошибка обновления задач');
      }
    } finally {
      if (!isInitialLoad) {
        setTasksFetchLock(false);
      }
    }
  };

  

  const handleUpdateDeadlines = async () => {
    if (tasksLoading) return;
    await fetchTasks(user?.id, true, false);
  };

  const handleUpdateReports = async () => {
    if (reportsLoading) return;
    await fetchReports(user?.id, true, false);
  };

  const isInitialLoadComplete = () => {
    return initialLoadProgress.schedule && initialLoadProgress.tasks && initialLoadProgress.reports;
  };

  // Показываем загрузку пока проверяем авторизацию
  if (loading || (authChecked && !isInitialLoadComplete())) {
    return (
      <Flex className="wrap" align="center"
        justify="center" direction="column">
        <Spinner />
        <div>Загрузка данных...</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {!initialLoadProgress.schedule && 'Расписание... '}
          {!initialLoadProgress.tasks && 'Задачи... '}
          {!initialLoadProgress.reports && 'Отчеты...'}
        </div>
      </Flex>
    );
  }

  if (!authChecked) {
    return null;
  }

  return (
    <Panel mode="secondary" className="wrap">
      {contextHolder}
      <Flex direction="column" align="stretch" gap={5}>
        <Container>
          <ScheduleSection
            todaySchedule={todaySchedule}
            scheduleLoading={scheduleLoading}
            user={user}
            onRefreshSchedule={() => fetchTodaySchedule(user?.id)}
          />

          <Divider />

          <DeadlinesSection
            tasks={tasks}
            tasksLoading={tasksLoading}
            onUpdateDeadlines={handleUpdateDeadlines}
          />

          <Divider />

          <ReportsSection
            reports={reports}
            reportsLoading={reportsLoading}
            onUpdateReports={handleUpdateReports}
          />

          <Divider />

          <PsychologistBooking user={user} />

          <Divider />

          <NotificationsSection />
        </Container>
      </Flex>
    </Panel>
  );
}