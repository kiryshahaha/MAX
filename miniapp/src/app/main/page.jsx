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
  Panel 
} from "@maxhub/max-ui";
import { Badge, Divider, Steps, Tag, message } from "antd";
import { clientSupabase as supabase } from "../../../lib/supabase-client";

export default function MainPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

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

    } catch (error) {
      console.error('Auth check error:', error);
      messageApi.error('Ошибка авторизации');
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

const handleLogout = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const username = session.user.user_metadata?.original_username || session.user.user_metadata?.username;
      
      // Закрываем сессию парсера
      if (username) {
        await fetch('http://localhost:3001/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
      }
    }

    // Выходим из Supabase
    await supabase.auth.signOut();
    router.push('/');
  } catch (error) {
    console.error('Logout error:', error);
    messageApi.error('Ошибка при выходе');
  }
};

  return (
    <Panel mode="secondary" className="wrap">
      {contextHolder}
      <Flex direction="column" align="stretch" gap={5}>
        <Container>
          <Flex justify="end" style={{ marginBottom: '10px' }}>
            <Button onClick={handleLogout}>Выйти</Button>
          </Flex>

          <CellList
            filled
            mode="island"
            header={
              <CellHeader
                titleStyle="caps"
                after={<Dot appearance="accent-red"></Dot>}
              >
                Расписание на сегодня
              </CellHeader>
            }
          >
            <CellSimple showChevron onClick={() => {}}>
              <Steps
                direction="vertical"
                percent={60}
                items={[
                  {
                    title: "Математика",
                    status: "finish",
                    subTitle: "2",
                    description: "09:00 — 10:30, Ауд. 205",
                  },
                  {
                    title: "Физика",
                    status: "process",
                    description: "11:00 — 12:30, Ауд. 210",
                  },
                  {
                    title: "Программирование",
                    description: "13:00 — 14:30, Ауд. 302",
                  },
                ]}
              />
            </CellSimple>
          </CellList>
        </Container>

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
