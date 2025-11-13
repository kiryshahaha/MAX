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
  Flex,
  Panel,
  Spinner
} from "@maxhub/max-ui";
import { Badge, Divider, Steps, Tag, message, Tabs } from "antd";
import { clientSupabase as supabase } from "../../../../lib/supabase-client";

export default function SchedulePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchSchedule(activeTab);
    }
  }, [activeTab, user?.id]);

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('❌ Нет активной сессии');
        router.push('/auth');
        return;
      }

      setUser(session.user);

    } catch (error) {
      console.error('Auth check error:', error);
      messageApi.error('Ошибка авторизации');
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (type) => {
    if (scheduleLoading) {
      console.log('⏳ Запрос расписания уже выполняется...');
      return;
    }

    try {
      setScheduleLoading(true);
      console.log(`📅 Запрашиваем расписание: ${type} для пользователя:`, user.id);

      let apiUrl = '';
      switch (type) {
        case 'today':
          apiUrl = `/api/schedule/today?uid=${user.id}`;
          break;
        case 'tomorrow':
          apiUrl = `/api/schedule/tomorrow?uid=${user.id}`;
          break;
        case 'yesterday':
          apiUrl = `/api/schedule/yesterday?uid=${user.id}`;
          break;
        case 'week':
          apiUrl = `/api/schedule/week?uid=${user.id}`;
          break;
        default:
          apiUrl = `/api/schedule/today?uid=${user.id}`;
      }

      const scheduleResponse = await fetch(apiUrl);

      if (!scheduleResponse.ok) {
        throw new Error(`Schedule API error: ${scheduleResponse.status}`);
      }

      const responseData = await scheduleResponse.json();
      console.log(`📊 Ответ от ${type} schedule API:`, responseData);

      if (responseData.success) {
        setScheduleData(responseData);
      } else {
        console.log(`🔄 Расписание на ${type} не найдено`);
        setScheduleData(null);
        messageApi.warning(responseData.message || `Расписание на ${getTabTitle(type)} не найдено`);
      }

    } catch (error) {
      console.error(`❌ Ошибка получения расписания (${activeTab}):`, error);
      messageApi.error(`Ошибка загрузки расписания на ${getTabTitle(activeTab)}`);
      setScheduleData(null);
    } finally {
      setScheduleLoading(false);
    }
  };

  const updateScheduleFromParser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        messageApi.error('Сессия не найдена');
        return;
      }

      const guapUsername = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      if (!guapUsername || !password) {
        console.error('❌ Отсутствуют данные для авторизации');
        messageApi.error('Данные для авторизации не найдены');
        return;
      }

      console.log('🚀 Отправляем запрос на обновление недельного расписания');
      const updateResponse = await fetch('/api/schedule/week/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: guapUsername,
          password,
          uid: user.id
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Update schedule API error: ${updateResponse.status} - ${errorText}`);
      }

      const updateData = await updateResponse.json();
      console.log('📊 Ответ от update schedule API:', updateData);

      if (updateData.success) {
        messageApi.success('Расписание обновлено');
        // После обновления перезагружаем текущее расписание
        fetchSchedule(activeTab);
      } else {
        messageApi.error(updateData.message || 'Ошибка обновления расписания');
      }

    } catch (error) {
      console.error('❌ Ошибка обновления расписания:', error);
      messageApi.error('Ошибка обновления расписания');
    }
  };

  const formatDaySchedule = (classes) => {
    if (!classes || !Array.isArray(classes)) {
      console.log('❌ formatDaySchedule: classes не является массивом:', classes);
      return [];
    }

    return classes.map((classItem, index) => ({
      title: classItem.subject || 'Не указано',
      description: `${classItem.type || ''}${classItem.timeRange ? ` • ${classItem.timeRange}` : ''}${classItem.building ? `, ${classItem.building}` : ''}${classItem.location ? `, ${classItem.location}` : ''}`,
      subTitle: classItem.pairNumber ? `${classItem.pairNumber}` : '',
      status: "wait"
    }));
  };

  const getTabTitle = (tabKey) => {
    const titles = {
      'today': 'сегодня',
      'tomorrow': 'завтра', 
      'yesterday': 'вчера',
      'week': 'неделю'
    };
    return titles[tabKey] || tabKey;
  };

  const getScheduleTitle = () => {
    const baseTitle = "Расписание";
    if (activeTab === 'week') {
      return `${baseTitle} на неделю ${scheduleData?.week ? `(неделя ${scheduleData.week})` : ''}`;
    }
    
    // Для дней (today/tomorrow/yesterday) используем данные из schedule.schedule
    if (scheduleData?.schedule) {
      const dayInfo = scheduleData.schedule;
      return `${baseTitle} на ${getTabTitle(activeTab)} (${dayInfo.date_dd_mm}, ${dayInfo.day_name})`;
    }
    
    return `${baseTitle} на ${getTabTitle(activeTab)}`;
  };

  const getWeekDotColor = () => {
    if (!scheduleData?.metadata?.is_even_week) {
      return 'accent-red';
    }
    return scheduleData.metadata.is_even_week ? 'accent-blue' : 'accent-red';
  };

  const getClassesForDay = () => {
    if (activeTab === 'week') {
      // Для недели берем дни из schedule.days
      return scheduleData?.schedule?.days || [];
    } else {
      // Для дней (today/tomorrow/yesterday) берем занятия из schedule.schedule.schedule
      return scheduleData?.schedule?.schedule || [];
    }
  };

  const renderScheduleContent = () => {
    if (scheduleLoading) {
      return <CellSimple><Spinner /></CellSimple>;
    }

    if (!scheduleData) {
      return (
        <CellSimple>
          Расписание не загружено
          <Button
            type="link"
            onClick={updateScheduleFromParser}
            style={{ marginTop: '10px' }}
            disabled={scheduleLoading}
          >
            Загрузить из ГУАП
          </Button>
        </CellSimple>
      );
    }

    if (activeTab === 'week') {
      // Рендерим недельное расписание
      const days = getClassesForDay();
      
      if (days.length === 0) {
        return <CellSimple>На неделю занятий нет</CellSimple>;
      }

      return days.map((day, dayIndex) => (
        <div key={dayIndex}>
          <CellSimple
            title={`${day.dayName}, ${day.date}`}
            titleStyle="bold"
            style={{ backgroundColor: '#f5f5f5' }}
          />
          {day.classes && day.classes.length > 0 ? (
            <CellSimple showChevron>
              <Steps
                direction="vertical"
                items={formatDaySchedule(day.classes)}
              />
            </CellSimple>
          ) : (
            <CellSimple>В этот день занятий нет</CellSimple>
          )}
          {dayIndex < days.length - 1 && <Divider />}
        </div>
      ));
    } else {
      // Рендерим расписание на день (today/tomorrow/yesterday)
      const classes = getClassesForDay();
      
      if (!Array.isArray(classes)) {
        console.error('❌ Classes не является массивом:', classes);
        return <CellSimple>Ошибка формата данных</CellSimple>;
      }

      if (classes.length === 0) {
        return <CellSimple>В этот день занятий нет</CellSimple>;
      }

      return (
        <CellSimple showChevron>
          <Steps
            direction="vertical"
            items={formatDaySchedule(classes)}
          />
        </CellSimple>
      );
    }
  };

  const handleBack = () => {
    router.back();
  };

  const tabItems = [
    {
      key: 'today',
      label: 'Сегодня',
    },
    {
      key: 'tomorrow',
      label: 'Завтра',
    },
    {
      key: 'yesterday', 
      label: 'Вчера',
    },
    {
      key: 'week',
      label: 'Неделя',
    },
  ];

  if (loading) {
    return (
      <Panel mode="secondary" className="wrap">
        <Flex justify="center" align="center" style={{ height: '200px' }}>
          <Spinner />
        </Flex>
      </Panel>
    );
  }

  return (
    <Panel mode="secondary" className="wrap">
      {contextHolder}
      <Flex direction="column" align="stretch" gap={5}>
        <Container>
          <Flex justify="space-between" align="center" style={{ marginBottom: '10px' }}>
            <Button onClick={handleBack}>Назад</Button>
            <Button 
              onClick={updateScheduleFromParser} 
              disabled={scheduleLoading}
            >
              {scheduleLoading ? <Spinner /> : 'Обновить'}
            </Button>
          </Flex>

          {/* Табы для переключения между днями */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginBottom: '20px' }}
          />

          {/* Расписание */}
          <CellList
            filled
            mode="island"
            header={
              <CellHeader
                titleStyle="caps"
                after={
                  activeTab === 'week' && scheduleData?.metadata?.is_even_week !== undefined && (
                    <Dot
                      appearance={getWeekDotColor()}
                    ></Dot>
                  )
                }
              >
                {getScheduleTitle()}
              </CellHeader>
            }
          >
            {renderScheduleContent()}
          </CellList>
        </Container>
      </Flex>
    </Panel>
  );
}