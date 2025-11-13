"use client";
import { useEffect, useState, useRef } from "react";
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
import PsychologistBooking from "../PsychologistBooking/PsychologistBooking";

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

  const initialLoadRef = useRef(true);

  useEffect(() => {
    // Запускаем только при первом монтировании
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      checkAuth();
    }
  }, []);

  // Обновите функцию checkAuth для загрузки отчетов
  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('❌ Нет активной сессии');
        router.push('/auth');
        return;
      }

      setUser(session.user);

      console.log('🔄 Последовательная загрузка данных...');

      // 1. Сначала расписание
      await fetchTodaySchedule(session.user.id);

      // 2. Затем задачи
      await fetchTasks(session.user.id);

      // 3. Затем отчеты
      await fetchReports(session.user.id);

    } catch (error) {
      console.error('Auth check error:', error);
      messageApi.error('Ошибка авторизации');
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (userId, forceUpdate = false) => {
    if (reportsLoading) {
      console.log('⏳ Запрос отчетов уже выполняется...');
      return;
    }

    try {
      setReportsLoading(true);
      console.log('📋 Запрашиваем отчеты для пользователя:', userId, { forceUpdate });

      if (forceUpdate) {
        console.log('🔄 Принудительное обновление через парсер');
        await updateReportsFromParser(userId);
        return;
      }

      const reportsResponse = await fetch(`/api/reports?uid=${userId}`);

      if (!reportsResponse.ok) {
        throw new Error(`Reports API error: ${reportsResponse.status}`);
      }

      const reportsData = await reportsResponse.json();
      console.log('📊 Ответ от reports API:', reportsData);

      // ДОБАВЬТЕ ЭТО ДЛЯ ДИАГНОСТИКИ СТРУКТУРЫ ДАННЫХ
      if (reportsData.reports && reportsData.reports.length > 0) {
        console.log('🔍 ДИАГНОСТИКА СТРУКТУРЫ ОТЧЕТОВ:', {
          totalReports: reportsData.reports.length,
          firstReport: reportsData.reports[0],
          statusStructure: reportsData.reports.map(r => ({
            number: r.number,
            status: r.status,
            statusType: typeof r.status,
            taskName: r.taskName
          }))
        });
      }

      if (reportsData.success && reportsData.reports && reportsData.reports_count > 0) {
        console.log('✅ Используем отчеты из бэкенда');
        setReports(reportsData.reports);
      } else {
        console.log('🔄 Отчеты не найдены в БД, обновляем через парсер');
        await updateReportsFromParser(userId);
      }

    } catch (error) {
      console.error('❌ Ошибка получения отчетов:', error);
      messageApi.error('Ошибка загрузки отчетов');
    } finally {
      setReportsLoading(false);
    }
  };

  // Функция для обновления отчетов через парсер
  const updateReportsFromParser = async (userId) => {
    if (reportsFetchLock) {
      console.log('⏳ Запрос отчетов уже выполняется, ждем...');
      return;
    }

    try {
      setReportsFetchLock(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      console.log('🔐 Данные для обновления отчетов:', {
        guapUsername,
        passwordExists: !!password
      });

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        messageApi.error('Данные для авторизации не найдены');
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
        messageApi.success('Отчеты обновлены');
      } else {
        messageApi.error(updateData.message || 'Ошибка обновления отчетов');
      }

    } catch (error) {
      console.error('❌ Ошибка обновления отчетов:', error);
      messageApi.error('Ошибка обновления отчетов');
    } finally {
      setReportsFetchLock(false);
    }
  };

  const fetchTodaySchedule = async (userId) => {
    if (scheduleLoading) {
      console.log('⏳ Запрос расписания уже выполняется...');
      return;
    }

    try {
      setScheduleLoading(true);
      console.log('📅 Запрашиваем расписание для пользователя:', userId);

      // 1. Запрашиваем расписание через наш API (который проверяет бэкенд)
      const scheduleResponse = await fetch(`/api/schedule/today?uid=${userId}`);

      if (!scheduleResponse.ok) {
        throw new Error(`Schedule API error: ${scheduleResponse.status}`);
      }

      const scheduleData = await scheduleResponse.json();
      console.log('📊 Ответ от schedule API:', scheduleData);

      // 2. ОБНОВЛЕННАЯ ЛОГИКА: если расписание не найдено ИЛИ флаг has_schedule = false
      const shouldUpdateFromParser = !scheduleData.success ||
        scheduleData.needsUpdate ||
        (scheduleData.schedule && scheduleData.schedule.has_schedule === false);

      if (scheduleData.success && scheduleData.schedule && !shouldUpdateFromParser) {
        console.log('✅ Используем актуальное расписание из бэкенда');
        console.log('   - Флаг has_schedule:', scheduleData.schedule.has_schedule);
        console.log('   - Дата актуальна:', scheduleData.schedule.date);
        setTodaySchedule(scheduleData.schedule);
      } else {
        // 3. Если расписания нет, устарело или дата не совпадает - обновляем через парсер
        console.log('🔄 Расписание не найдено, устарело или дата не совпадает, обновляем через парсер');
        console.log('   - Причина:',
          !scheduleData.success ? 'API не успешно' :
            scheduleData.needsUpdate ? 'Требуется обновление' :
              scheduleData.reason === 'date_mismatch' ? 'Дата не совпадает' :
                'has_schedule = false');
        await updateScheduleFromParser(userId);
      }

    } catch (error) {
      console.error('❌ Ошибка получения расписания:', error);
      messageApi.error('Ошибка загрузки расписания');
    } finally {
      setScheduleLoading(false);
    }
  };

  const updateScheduleFromParser = async (userId) => {
    if (fetchLock) {
      console.log('⏳ Запрос уже выполняется, ждем...');
      return;
    }

    try {
      setFetchLock(true);

      // Получаем актуальные данные пользователя
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');
      const currentDate = new Date();
      const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

      console.log('🔐 Данные для обновления расписания:', {
        guapUsername,
        passwordExists: !!password,
        currentDate
      });

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        messageApi.error('Данные для авторизации не найдены');
        return;
      }

      // 4. Используем API для обновления расписания через парсер
      console.log('🚀 Отправляем запрос на обновление расписания');
      const updateResponse = await fetch('/api/schedule/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: guapUsername,
          password,
          date: currentDateString  // Используем исправленную дату
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
        messageApi.success('Расписание обновлено');
      } else {
        messageApi.error(updateData.message || 'Ошибка обновления расписания');
      }

    } catch (error) {
      console.error('❌ Ошибка обновления расписания:', error);
      messageApi.error('Ошибка обновления расписания');
    } finally {
      setFetchLock(false);
    }
  };

  // Остальные функции остаются без изменений
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

    return undefined;
  };

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Если сессии нет, просто переходим на главную
        router.push('/');
        return;
      }

      const username = session.user.user_metadata?.original_username || session.user.user_metadata?.username;

      // Используем API для выхода
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!logoutResponse.ok) {
        const errorText = await logoutResponse.text();
        throw new Error(`Logout API error: ${logoutResponse.status} - ${errorText}`);
      }

      const logoutData = await logoutResponse.json();

      if (logoutData.success) {
        // Очищаем локальное хранилище
        localStorage.removeItem('guap_password');
        router.push('/');
        messageApi.success('Успешный выход');
      } else {
        throw new Error(logoutData.message);
      }

    } catch (error) {
      console.error('Logout error:', error);
      messageApi.error('Ошибка при выходе');
      // В любом случае пытаемся перенаправить пользователя
      localStorage.removeItem('guap_password');
      router.push('/');
    }
  };

  // Добавьте функции для работы с задачами
  const fetchTasks = async (userId, forceUpdate = false) => {
    if (tasksLoading) {
      console.log('⏳ Запрос задач уже выполняется...');
      return;
    }

    try {
      setTasksLoading(true);
      console.log('📝 Запрашиваем задачи для пользователя:', userId, { forceUpdate });

      // Если forceUpdate = true (нажата кнопка "Обновить") - всегда запускаем парсинг
      if (forceUpdate) {
        console.log('🔄 Принудительное обновление через парсер');
        await updateTasksFromParser(userId);
        return;
      }

      // Обычный запрос (при загрузке страницы) - проверяем БД
      const tasksResponse = await fetch(`/api/tasks?uid=${userId}`);

      if (!tasksResponse.ok) {
        throw new Error(`Tasks API error: ${tasksResponse.status}`);
      }

      const tasksData = await tasksResponse.json();
      console.log('📊 Ответ от tasks API:', tasksData);

      // Если задачи найдены в БД - используем их
      if (tasksData.success && tasksData.tasks && tasksData.tasks_count > 0) {
        console.log('✅ Используем задачи из бэкенда');
        setTasks(tasksData.tasks);
      } else {
        // Если задач нет в БД - обновляем через парсер
        console.log('🔄 Задачи не найдены в БД, обновляем через парсер');
        await updateTasksFromParser(userId);
      }

    } catch (error) {
      console.error('❌ Ошибка получения задач:', error);
      messageApi.error('Ошибка загрузки задач');
    } finally {
      setTasksLoading(false);
    }
  };
  const updateTasksFromParser = async (userId) => {
    if (tasksFetchLock) {
      console.log('⏳ Запрос задач уже выполняется, ждем...');
      return;
    }

    try {
      setTasksFetchLock(true);

      // Получаем актуальные данные пользователя
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      console.log('🔐 Данные для обновления задач:', {
        guapUsername,
        passwordExists: !!password
      });

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        messageApi.error('Данные для авторизации не найдены');
        return;
      }

      // Используем API для обновления задач через парсер
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
        messageApi.success('Задачи обновлены');
      } else {
        messageApi.error(updateData.message || 'Ошибка обновления задач');
      }

    } catch (error) {
      console.error('❌ Ошибка обновления задач:', error);
      messageApi.error('Ошибка обновления задач');
    } finally {
      setTasksFetchLock(false);
    }
  };

  // Функция для форматирования дедлайнов
  const formatDeadlineTasks = (tasks) => {
    if (!tasks || !Array.isArray(tasks)) return [];

    return tasks
      .filter(task => {
        // Фильтруем задачи с валидными дедлайнами (не "Спи спокойно")
        const deadlineText = task.deadline?.text;
        const hasValidDeadline = deadlineText && deadlineText !== 'Спи спокойно';

        // ИСКЛЮЧАЕМ задачи со статусом "принят" или "ожидает проверки"
        const status = task.status?.text?.toLowerCase();
        const hasExcludingStatus = status === 'принят' || status === 'ожидает проверки';

        return hasValidDeadline && !hasExcludingStatus;
      })
      .sort((a, b) => {
        // Сортируем по дате дедлайна
        const dateA = parseDate(a.deadline.text);
        const dateB = parseDate(b.deadline.text);
        return dateA - dateB;
      })
      .slice(0, 25); // Берем ближайшие дедлайны
  };

  // Функция для парсинга даты из текста
  const parseDate = (dateText) => {
    if (!dateText || dateText === 'Спи спокойно') return Infinity;

    try {
      const [day, month, year] = dateText.split('.').map(Number);
      return new Date(year, month - 1, day).getTime();
    } catch (error) {
      return Infinity;
    }
  };



  // Обновите обработчик кнопки "Обновить" для обновления и задач, и отчетов
  const handleUpdateDeadlines = async () => {
    if (tasksLoading) return;

    try {
      await fetchTasks(user?.id, true);
    } catch (error) {
      console.error('Ошибка при обновлении дедлайнов:', error);
    }
  };

  const getDeadlineTagColor = (deadlineText) => {
    if (!deadlineText || deadlineText === 'Спи спокойно') return 'default';

    try {
      const [day, month, year] = deadlineText.split('.').map(Number);
      const deadlineDate = new Date(year, month - 1, day);
      const today = new Date();
      const timeDiff = deadlineDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysDiff < 0) return 'error'; // Просрочено
      if (daysDiff <= 3) return 'error'; // Меньше 3 дней
      if (daysDiff <= 7) return 'warning'; // Меньше недели
      return 'success'; // Больше недели
    } catch (error) {
      return 'default';
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
        description: `${classItem.type || ''}${classItem.timeRange ? ` • ${classItem.timeRange}` : ''}${classItem.building ? `, ${classItem.building}` : ''}${classItem.location ? `, ${classItem.location}` : ''}`,
        subTitle: classItem.pairNumber ? `${classItem.pairNumber}` : '',
        status,
        percent
      };



    });
  };

  // Исправленная функция для фильтрации и форматирования отчетов
  const getReportTitle = (report) => {
    if (!report) return 'Без названия';

    return report.task?.name || 'Без названия';
  };

  // Функция для получения преподавателя
  const getReportTeacher = (report) => {
    if (!report) return 'Не указан';

    return report.teacher?.full_name || 'Не указан';
  };

  // Улучшенная функция для фильтрации и форматирования отчетов
  const formatReports = (reports) => {
    if (!reports || !Array.isArray(reports)) return { pending: [], recentProcessed: [] };

    console.log('🔍 formatReports - входные данные:', reports);

    // ДИАГНОСТИКА СТРУКТУРЫ
    if (reports.length > 0) {
      console.log('🔍 СТРУКТУРА ОТЧЕТА:', {
        taskName: getReportTitle(reports[0]),
        teacher: getReportTeacher(reports[0]),
        status: getReportStatusText(reports[0].status)
      });
    }

    const pendingReports = reports.filter(report => {
      const statusText = getReportStatusText(report.status);
      return statusText === 'Ожидает';
    });

    // Получаем отклоненные/принятые отчеты и сортируем по номеру (новые сначала)
    const processedReports = reports
      .filter(report => {
        const statusText = getReportStatusText(report.status);
        return statusText === 'Отклонен' || statusText === 'Принят';
      })
      .sort((a, b) => {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numB - numA; // Новые сначала
      })
      .slice(0, 5);

    console.log('🔍 formatReports - результат:', {
      pending: pendingReports.length,
      processed: processedReports.length,
      pendingTitles: pendingReports.map(r => getReportTitle(r)),
      processedTitles: processedReports.map(r => getReportTitle(r))
    });

    return {
      pending: pendingReports,
      recentProcessed: processedReports
    };
  };

  const getReportStatusColor = (status) => {
    const statusText = getReportStatusText(status);
    const statusLower = statusText.toLowerCase();

    switch (statusLower) {
      case 'ожидает':
        return 'processing';
      case 'принят':
        return 'success';
      case 'отклонен':
        return 'error';
      default:
        return 'default';
    }
  };


  // Улучшенная функция для получения текста статуса
  const getReportStatusText = (status) => {
    if (!status) return 'Неизвестно';

    // Если статус - строка, используем как есть
    if (typeof status === 'string') {
      const statusLower = status.toLowerCase();
      switch (statusLower) {
        case 'ожидает проверки':
          return 'Ожидает';
        case 'принят':
          return 'Принят';
        case 'отклонен':
        case 'не принят':
          return 'Отклонен';
        default:
          return status;
      }
    }
    // Если статус - объект, извлекаем текстовое значение
    if (typeof status === 'object') {
      // Пробуем разные возможные поля
      const statusValue = status.text || status.name || status.value || status.status;
      if (statusValue) {
        const statusLower = String(statusValue).toLowerCase();
        switch (statusLower) {
          case 'ожидает проверки':
            return 'Ожидает';
          case 'принят':
            return 'Принят';
          case 'отклонен':
          case 'не принят':
            return 'Отклонен';
          default:
            return String(statusValue);
        }
      }
    }

    return 'Неизвестно';
  };

  // Добавьте обработчик для обновления отчетов
  const handleUpdateReports = async () => {
    if (reportsLoading) return;

    try {
      await fetchReports(user?.id, true);
    } catch (error) {
      console.error('Ошибка при обновлении отчетов:', error);
    }
  };

  const getWeekDotColor = (schedule) => {
    if (!schedule?.metadata?.is_even_week) {
      return 'accent-red'; // По умолчанию красный, если данные недоступны
    }

    return schedule.metadata.is_even_week ? 'accent-blue' : 'accent-red';
  };

  console.log('📅 Расписание загружено:', {
    hasSchedule: !!todaySchedule,
    hasMetadata: !!todaySchedule?.metadata,
    isEvenWeek: todaySchedule?.metadata?.is_even_week
  });

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
                after={
                  <Dot
                    appearance={
                      todaySchedule?.metadata?.is_even_week !== undefined
                        ? (todaySchedule.metadata.is_even_week ? 'themed' : 'accent-red')
                        : 'accent-red'
                    }
                  ></Dot>
                }
              >
                Расписание на сегодня {todaySchedule?.date_dd_mm}
              </CellHeader>
            }
          >
            {scheduleLoading ? (
              <CellSimple><Spinner /></CellSimple>
            ) : todaySchedule ? (
              todaySchedule.schedule.length > 0 ? (
                <CellSimple showChevron onClick={() => router.push('/schedule/week')}>
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
                    onClick={() => !scheduleLoading && fetchTodaySchedule(user?.id)}
                    style={{ marginTop: '10px' }}
                    disabled={scheduleLoading}
                  >
                    Обновить
                  </Button>
                </CellSimple>
              )
            ) : (
              <CellSimple>
                Расписание не загружено
                <Button
                  type="link"
                  onClick={() => !scheduleLoading && fetchTodaySchedule(user?.id)}
                  style={{ marginTop: '10px' }}
                  disabled={scheduleLoading}
                >
                  Загрузить
                </Button>
              </CellSimple>
            )}
          </CellList>
        </Container>

        {/* <Divider></Divider> */}

        <Divider></Divider>

        <Container>
          <CellList
            filled
            mode="island"
            header={
              <CellHeader titleStyle="caps">
                <Flex direction="row" align="center" justify="space-between">
                  <span>Ближайшие дедлайны</span>
                  <Button
                    type="link"
                    onClick={handleUpdateDeadlines}
                    disabled={tasksLoading}
                    style={{ fontSize: '12px' }}
                  >
                    {tasksLoading ? <Spinner /> : 'Обновить'}
                  </Button>
                </Flex>
              </CellHeader>
            }
          >
            {tasksLoading ? (
              <CellSimple><Spinner /></CellSimple>
            ) : formatDeadlineTasks(tasks).length > 0 ? (
              formatDeadlineTasks(tasks).map((task, index) => (
                <CellSimple
                  key={index}
                  after={
                    <Tag color={getDeadlineTagColor(task.deadline?.text)}>
                      {task.deadline?.text}
                    </Tag>
                  }
                  title={task.subject?.name || 'Не указано'}
                  subtitle={task.task?.name || task.task?.title || 'Без названия'}
                ></CellSimple>
              ))
            ) : (
              <CellSimple>
                Нет ближайших дедлайнов
                <Button
                  type="link"
                  onClick={handleUpdateDeadlines}
                  style={{ marginTop: '10px' }}
                  disabled={tasksLoading}
                >
                  Загрузить задачи
                </Button>
              </CellSimple>
            )}
          </CellList>
        </Container>

        <Divider></Divider>

        <Container>
          <CellList
            filled
            mode="island"
            header={
              <CellHeader titleStyle="caps">
                <Flex direction="row" align="center" justify="space-between">
                  <span>Отчеты</span>
                  <Button
                    type="link"
                    onClick={handleUpdateReports}
                    disabled={reportsLoading}
                    style={{ fontSize: '12px' }}
                  >
                    {reportsLoading ? <Spinner /> : 'Обновить'}
                  </Button>
                </Flex>
              </CellHeader>
            }
          >
            {reportsLoading ? (
              <CellSimple><Spinner /></CellSimple>
            ) : reports.length > 0 ? (
              <>
                {/* Все отчеты со статусом "ожидает проверки" */}
                {formatReports(reports).pending.map((report, index) => (
                  <CellSimple
                    key={`pending-${index}`}
                    after={
                      <Tag color={getReportStatusColor(report.status)}>
                        {getReportStatusText(report.status)}
                      </Tag>
                    }
                    title={getReportTitle(report)}
                    subtitle={`Преподаватель: ${getReportTeacher(report)}`}
                  ></CellSimple>
                ))}

                {/* Последние 5 отклоненных/принятых отчетов */}
                {formatReports(reports).recentProcessed.map((report, index) => (
                  <CellSimple
                    key={`processed-${index}`}
                    after={
                      <Tag color={getReportStatusColor(report.status)}>
                        {getReportStatusText(report.status)}
                      </Tag>
                    }
                    title={getReportTitle(report)}
                    subtitle={`Преподаватель: ${getReportTeacher(report)}`}
                  ></CellSimple>
                ))}

                {/* Если нет отчетов для показа */}
                {formatReports(reports).pending.length === 0 && formatReports(reports).recentProcessed.length === 0 && (
                  <CellSimple>Нет отчетов для отображения</CellSimple>
                )}
              </>
            ) : (
              <CellSimple>
                Отчеты не загружены
                <Button
                  type="link"
                  onClick={handleUpdateReports}
                  style={{ marginTop: '10px' }}
                  disabled={reportsLoading}
                >
                  Загрузить отчеты
                </Button>
              </CellSimple>
            )}
          </CellList>
        </Container>

        <Divider></Divider>

        <PsychologistBooking user={user} />
        
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
