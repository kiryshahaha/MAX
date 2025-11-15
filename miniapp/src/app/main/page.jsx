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


      await fetchTodaySchedule(session.user.id, true);
      await new Promise(resolve => setTimeout(resolve, 500)); 

      await fetchTasks(session.user.id, false, true);
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchReports(session.user.id, false, true);


    } catch (error) {
      router.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (userId, forceUpdate = false, isInitialLoad = false) => {
    if (reportsLoading && !isInitialLoad) {
      return;
    }

    try {
      if (!isInitialLoad) {
        setReportsLoading(true);
      }


      if (forceUpdate) {
        await updateReportsFromParser(userId, isInitialLoad);
        return;
      }

      const reportsResponse = await fetch(`/api/reports?uid=${userId}`);

      if (!reportsResponse.ok) {
        throw new Error(`Reports API error: ${reportsResponse.status}`);
      }

      const reportsData = await reportsResponse.json();

      if (reportsData.success && reportsData.reports && reportsData.reports_count > 0) {
        if (reportsData.source === 'supabase') {
        } else if (reportsData.source === 'parser') {
        } else {
        }

        setReports(reportsData.reports);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, reports: true }));
        }
      } else {
        await updateReportsFromParser(userId, isInitialLoad);
      }

    } catch (error) {
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
        if (!isInitialLoad) messageApi.error('Данные для авторизации не найдены');
        return;
      }

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
      return;
    }

    try {
      if (!isInitialLoad) {
        setScheduleLoading(true);
      }


      const scheduleResponse = await fetch(`/api/schedule/today?uid=${userId}`);

      if (!scheduleResponse.ok) {
        throw new Error(`Schedule API error: ${scheduleResponse.status}`);
      }

      const scheduleData = await scheduleResponse.json();

      const shouldUpdateFromParser = !scheduleData.success ||
        scheduleData.needsUpdate ||
        (scheduleData.schedule && scheduleData.schedule.has_schedule === false);

      if (scheduleData.success && scheduleData.schedule && !shouldUpdateFromParser) {
        setTodaySchedule(scheduleData.schedule);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, schedule: true }));
        }
      } else {
        await updateScheduleFromParser(userId, isInitialLoad);
      }

    } catch (error) {
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
        if (!isInitialLoad) messageApi.error('Данные для авторизации не найдены');
        return;
      }

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
      return;
    }

    try {
      if (!isInitialLoad) {
        setTasksLoading(true);
      }


      if (forceUpdate) {
        await updateTasksFromParser(userId, isInitialLoad);
        return;
      }

      const tasksResponse = await fetch(`/api/tasks?uid=${userId}`);

      if (!tasksResponse.ok) {
        throw new Error(`Tasks API error: ${tasksResponse.status}`);
      }

      const tasksData = await tasksResponse.json();

      if (tasksData.success && tasksData.tasks && tasksData.tasks_count > 0) {
        if (tasksData.source === 'supabase') {
        } else if (tasksData.source === 'parser') {
        } else {
        }

        setTasks(tasksData.tasks);
        if (isInitialLoad) {
          setInitialLoadProgress(prev => ({ ...prev, tasks: true }));
        }
      } else {
        await updateTasksFromParser(userId, isInitialLoad);
      }

    } catch (error) {
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
        if (!isInitialLoad) messageApi.error('Данные для авторизации не найдены');
        return;
      }

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