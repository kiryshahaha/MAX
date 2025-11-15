"use client";
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
  Spinner,
  Avatar,
  Typography,
  Grid,
  ToolButton,
  CellAction,
  CellInput,
  Switch,
  IconButton,
  Counter
} from "@maxhub/max-ui";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { clientSupabase as supabase } from "../../../../lib/supabase-client.js";

export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [autoUpdating, setAutoUpdating] = useState(false);
  const [autoUpdateAttempted, setAutoUpdateAttempted] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setAutoUpdateAttempted(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Пользователь не авторизован');
      }

      const userId = session.user.id;

      const response = await fetch(`/api/profile?uid=${userId}`);

      if (!response.ok) {
        throw new Error(`Ошибка загрузки профиля: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);

        if (isEmptyProfile(data.profile) && !autoUpdateAttempted) {
          await handleAutoUpdateProfile();
        }
      } else {
        setProfile(null);
        if (!autoUpdateAttempted) {
          await handleAutoUpdateProfile();
        }
      }

    } catch (err) {

      if (!autoUpdateAttempted) {
        await handleAutoUpdateProfile();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem('guap_password');
        sessionStorage.clear();
        router.replace('/auth');
        return;
      }

      const username = session.user.user_metadata?.original_username || session.user.user_metadata?.username;

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
        localStorage.removeItem('guap_password');
        localStorage.clear();
        sessionStorage.clear();

        await supabase.auth.signOut();

        await new Promise(resolve => setTimeout(resolve, 1000));

        window.location.href = '/auth';
      } else {
        throw new Error(logoutData.message);
      }

    } catch (error) {
      localStorage.removeItem('guap_password');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
    }
  };
  const isEmptyProfile = (profileData) => {
    if (!profileData) {
      return true;
    }


    if (profileData.personal_info) {
      const isEmpty = !profileData.personal_info.full_name &&
        !profileData.academic_info?.group;
      return isEmpty;
    }

    const isEmpty = !profileData.fullName && !profileData.group;
    return isEmpty;
  };

  const handleAutoUpdateProfile = async () => {
    try {
      setAutoUpdating(true);
      setAutoUpdateAttempted(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const userId = session.user.id;
      const username = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      if (!username || !password) {
        return;
      }


      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          uid: userId
        }),
      });

      if (!response.ok) {
        await loadExistingProfile();
        return;
      }

      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setError(null);
      } else {
        await loadExistingProfile();
      }

    } catch (err) {
      await loadExistingProfile();
    } finally {
      setAutoUpdating(false);
    }
  };

  const loadExistingProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;
      const response = await fetch(`/api/profile?uid=${userId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (err) {
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Пользователь не авторизован');
      }

      const userId = session.user.id;
      const username = session.user.user_metadata?.guap_username ||
        session.user.user_metadata?.original_username ||
        session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      if (!username || !password) {
        throw new Error('Отсутствуют данные для авторизации');
      }

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          uid: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка обновления профиля: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
      } else {
        throw new Error(data.message || 'Ошибка обновления профиля');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getProfileData = () => {
    if (!profile) {
      return null;
    }

    if (profile.fullName) {
      return {
        fullName: profile.fullName || 'Не указано',
        group: profile.group || 'Не указано',
        status: profile.status || 'Не указано',
        studentId: profile.studentId || 'Не указано',
        direction: profile.direction || 'Не указано',
        institute: profile.institute || 'Не указано',
        specialty: profile.specialty || 'Не указано',
        educationForm: profile.educationForm || 'Не указано',
        educationLevel: profile.educationLevel || 'Не указано',
        enrollmentOrder: profile.enrollmentOrder || 'Не указано',
        email: profile.email || 'Не указано',
        phone: profile.phone || 'Не указано',
        photoUrl: profile.photoUrl || null
      };
    }

    const profileData = {
      fullName: profile.personal_info?.full_name || 'Не указано',
      group: profile.academic_info?.group || 'Не указано',
      status: profile.academic_info?.status || 'Не указано',
      studentId: profile.personal_info?.student_id || 'Не указано',
      direction: profile.program_info?.direction || 'Не указано',
      institute: profile.program_info?.institute || 'Не указано',
      specialty: profile.program_info?.specialty?.name ||
        profile.program_info?.specialty?.full_name ||
        'Не указано',
      educationForm: profile.academic_info?.education_form || 'Не указано',
      educationLevel: profile.academic_info?.education_level || 'Не указано',
      enrollmentOrder: profile.academic_info?.enrollment_order || 'Не указано',
      email: profile.contacts?.primary_email ||
        profile.contacts?.secondary_email ||
        'Не указано',
      phone: profile.contacts?.phone || 'Не указано',
      photoUrl: profile.personal_info?.photo_url || null
    };

    return profileData;
  };

  const profileData = getProfileData();

  const isLoading = loading || autoUpdating;

  if (isLoading) {
    return (
      <Panel mode="secondary">
        <Container>
          <Flex direction="column" gap={20} align="center" justify="center" style={{ minHeight: '200px' }}>
            <Spinner />
            <EllipsisText>
              {autoUpdating ? 'Автоматическое обновление профиля...' : 'Загрузка профиля...'}
            </EllipsisText>
          </Flex>
        </Container>
      </Panel>
    );
  }

  if (error && !autoUpdating) {
    return (
      <Panel mode="secondary">
        <Container>
          <Flex direction="column" gap={20} align="center" justify="center" style={{ minHeight: '200px' }}>
            <EllipsisText type="danger">Ошибка: {error}</EllipsisText>
            <Flex gap={10}>
              <Button onClick={fetchProfile}>
                Попробовать снова
              </Button>
              <Button onClick={handleUpdateProfile} disabled={updating}>
                {updating ? <Spinner size="small" /> : 'Обновить данные'}
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Panel>
    );
  }

  if (!profileData || isEmptyProfile(profile)) {
    console.log('Профиль пустой после всех попыток загрузки');
    return (
      <Panel mode="secondary">
        <Container>
          <Flex direction="column" gap={20} align="center" justify="center" style={{ minHeight: '200px' }}>
            <EllipsisText>Профиль не найден</EllipsisText>
            <Flex gap={10}>
              <Button onClick={fetchProfile}>
                Загрузить профиль
              </Button>
              <Button onClick={handleUpdateProfile} disabled={updating}>
                {updating ? <Spinner /> : 'Обновить данные'}
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Panel>
    );
  }


  return (
    <Panel mode="secondary" className="wrap" >
      <Flex direction="column" gap={24} align="center">
        {/* Шапка профиля */}
        <Container>
          <Flex direction="column" align="center" gap={16} >
            <Avatar.Container size={96}>
              <Avatar.Image
                fallback={profileData.fullName.split(' ').map(n => n[0]).join('')}
                src={profileData.photoUrl}
              />
            </Avatar.Container>

            <Flex direction="column" align="center">
              <Typography.Headline variant="large-strong">
                {profileData.fullName}
              </Typography.Headline>
              <Typography.Body variant="small">
                Группа {profileData.group}
              </Typography.Body>
            </Flex>
          </Flex>
        </Container>

        {/* Основная информация */}
        <Flex direction="column" gap={16}>
          <CellList
            mode="island"
            header={<CellHeader>Основная информация</CellHeader>}
          >
            <CellSimple
              height="compact"
              title="Статус"
              subtitle={profileData.status}
            />
            <CellSimple
              height="compact"
              title="Студенческий билет"
              subtitle={profileData.studentId}
            />
          </CellList>

          {/* Контактная информация */}
          <CellList
            mode="island"
            header={<CellHeader>Контактная информация</CellHeader>}
          >
            <CellAction
              height="compact"
              onClick={() => { }}
            >
              {profileData.phone}
            </CellAction>
            <CellAction
              height="compact"
              onClick={() => { }}
            >
              {profileData.email}
            </CellAction>
          </CellList>

          {/* Академическая информация */}
          <CellList
            mode="island"
            header={<CellHeader>Академическая информация</CellHeader>}
          >
            <CellSimple
              height="compact"
              title="Направление"
              subtitle={profileData.direction}
            />
            <CellSimple
              height="compact"
              title="Институт"
              subtitle={profileData.institute}
            />
            <CellSimple
              height="compact"
              title="Специальность"
              subtitle={profileData.specialty}
            />
            <CellSimple
              height="compact"
              title="Уровень образования"
              subtitle={profileData.educationLevel}
            />
            <CellSimple
              height="compact"
              title="Форма обучения"
              subtitle={profileData.educationForm}
            />
            <CellSimple
              height="compact"
              title="Приказ о зачислении"
              subtitle={profileData.enrollmentOrder}
            />
          </CellList>

          <CellList mode="island">
            <CellSimple
              showChevron
              onClick={() => { }}
              title="Успеваемость"
              after={
                <Counter
                  value={4433}
                  rounded
                />
              }
              subtitle="Оценки и посещаемость"
            />
          </CellList>
        </Flex>
        <Container style={{width: '100%'}}>
          <Button onClick={handleLogout} size="medium" stretched>Выйти</Button>
        </Container>
        {/* Действия
        <Container
        style={{width: '100%'}}
        >
          <Button
            size="large"
            mode="secondary"
            appearance="neutral"
            stretched
            onClick={handleUpdateProfile}
            disabled={updating}
          >
            {updating ? <Spinner /> : 'Обновить данные'}
          </Button>
        </Container> */}
      </Flex>
    </Panel>
  );
}