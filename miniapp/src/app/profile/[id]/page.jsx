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
  Spinner
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
      console.log('🔄 Запрашиваем профиль для пользователя:', userId);
      
      const response = await fetch(`/api/profile?uid=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки профиля: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Получены данные профиля:', data);
      
      if (data.success) {
        console.log('✅ Профиль успешно загружен, структура:', data.profile);
        setProfile(data.profile);
        
        // Автоматически запускаем парсер если профиль пустой И мы еще не пытались
        if (isEmptyProfile(data.profile) && !autoUpdateAttempted) {
          console.log('🔄 Профиль пустой, запускаем автоматическое обновление...');
          await handleAutoUpdateProfile();
        }
      } else {
        console.log('❌ Профиль не найден в ответе');
        setProfile(null);
        // Если профиль не найден, пробуем автоматическое обновление
        if (!autoUpdateAttempted) {
          console.log('🔄 Профиль не найден, запускаем автоматическое обновление...');
          await handleAutoUpdateProfile();
        }
      }

    } catch (err) {
      console.error('❌ Ошибка загрузки профиля:', err);
      
      // При ошибке тоже пробуем автоматическое обновление (только один раз)
      if (!autoUpdateAttempted) {
        console.log('🔄 Ошибка загрузки, пробуем автоматическое обновление...');
        await handleAutoUpdateProfile();
      } else {
        // Если уже пробовали автообновление и все равно ошибка - показываем её
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Проверяем, пустой ли профиль
  const isEmptyProfile = (profileData) => {
    if (!profileData) {
      console.log('🔍 Профиль пустой: profileData is null');
      return true;
    }
    
    console.log('🔍 Проверяем структуру профиля:', profileData);
    
    // Если профиль в новой структуре (из парсера)
    if (profileData.personal_info) {
      const isEmpty = !profileData.personal_info.full_name && 
                     !profileData.academic_info?.group;
      console.log('🔍 Проверка новой структуры:', { 
        full_name: profileData.personal_info.full_name,
        group: profileData.academic_info?.group,
        isEmpty 
      });
      return isEmpty;
    }
    
    // Если профиль в старой структуре
    const isEmpty = !profileData.fullName && !profileData.group;
    console.log('🔍 Проверка старой структуры:', { 
      fullName: profileData.fullName,
      group: profileData.group,
      isEmpty 
    });
    return isEmpty;
  };

  // Автоматическое обновление профиля (без показа ошибок пользователю)
  const handleAutoUpdateProfile = async () => {
    try {
      setAutoUpdating(true);
      setAutoUpdateAttempted(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('⚠️ Нет сессии для автоматического обновления');
        return;
      }

      const userId = session.user.id;
      const username = session.user.user_metadata?.guap_username || 
                      session.user.user_metadata?.original_username || 
                      session.user.user_metadata?.username;
      const password = localStorage.getItem('guap_password');

      if (!username || !password) {
        console.log('⚠️ Нет данных для автоматического обновления');
        return;
      }

      console.log('🔄 Автоматическое обновление профиля через парсер...');
      
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
        console.error('❌ Ошибка автоматического обновления профиля:', response.status);
        // НЕ устанавливаем ошибку - пробуем загрузить существующий профиль
        await loadExistingProfile();
        return;
      }

      const data = await response.json();
      console.log('📊 Данные после автоматического обновления:', data);
      
      if (data.success) {
        setProfile(data.profile);
        console.log('✅ Профиль автоматически обновлен');
        setError(null);
      } else {
        console.error('❌ Ошибка автоматического обновления:', data.message);
        // Пробуем загрузить существующий профиль
        await loadExistingProfile();
      }

    } catch (err) {
      console.error('❌ Ошибка автоматического обновления профиля:', err);
      // Пробуем загрузить существующий профиль
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
          console.log('✅ Загружен существующий профиль из БД');
        }
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки существующего профиля:', err);
    }
  };

  // Ручное обновление профиля (с показом ошибок пользователю)
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

      console.log('🔄 Ручное обновление профиля...');
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
      console.log('📊 Данные после ручного обновления:', data);
      
      if (data.success) {
        setProfile(data.profile);
        console.log('✅ Профиль успешно обновлен');
      } else {
        throw new Error(data.message || 'Ошибка обновления профиля');
      }

    } catch (err) {
      console.error('❌ Ошибка обновления профиля:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Улучшенная функция для получения данных профиля с защитой от ошибок
  const getProfileData = () => {
    if (!profile) {
      console.log('❌ getProfileData: profile is null');
      return null;
    }

    console.log('🔍 getProfileData - исходный профиль:', profile);

    // Если профиль уже в плоской структуре (старый формат)
    if (profile.fullName) {
      console.log('📝 Используем старую структуру профиля');
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

    // Преобразуем новую структуру в плоскую
    console.log('📝 Преобразуем новую структуру профиля');
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

    console.log('📊 Преобразованные данные профиля:', profileData);
    return profileData;
  };

  const profileData = getProfileData();
  console.log('🎯 Final profileData для отображения:', profileData);

  // Комбинированная загрузка (начальная + автоматическое обновление)
  const isLoading = loading || autoUpdating;

  // Показываем загрузку пока идет начальная загрузка или автоматическое обновление
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

  // Показываем ошибку ТОЛЬКО если это ручное обновление и есть ошибка
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

  // Если профиль пустой после всех попыток
  if (!profileData || isEmptyProfile(profile)) {
    console.log('❌ Профиль пустой после всех попыток загрузки');
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

  console.log('🎨 Рендерим профиль с данными:', profileData);

  return (
    <Panel mode="secondary" className="wrap">
      <Flex direction="column" align="stretch" gap={5}>
        <Container>
          {/* Основная информация профиля */}
          <CellList
            filled
            mode="island"
            header={
              <CellHeader
                title={profileData.fullName}
                description={profileData.group}
                after={
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={updating}
                    size="small"
                  >
                    {updating ? <Spinner size="small" /> : 'Обновить'}
                  </Button>
                }
              />
            }
          >
            <CellSimple
              title="Статус"
              subtitle={profileData.status}
            />
            <CellSimple
              title="Студенческий билет"
              subtitle={profileData.studentId}
            />
          </CellList>

          {/* Академическая информация */}
          <CellList
            filled
            mode="island"
            header={<CellHeader titleStyle="caps">Академическая информация</CellHeader>}
            style={{ marginTop: 20 }}
          >
            <CellSimple
              title="Направление"
              subtitle={profileData.direction}
            />
            <CellSimple
              title="Институт"
              subtitle={profileData.institute}
            />
            <CellSimple
              title="Специальность"
              subtitle={profileData.specialty}
            />
            <CellSimple
              title="Уровень образования"
              subtitle={profileData.educationLevel}
            />
            <CellSimple
              title="Форма обучения"
              subtitle={profileData.educationForm}
            />
            <CellSimple
              title="Приказ о зачислении"
              subtitle={profileData.enrollmentOrder}
            />
          </CellList>

          {/* Контактная информация */}
          <CellList
            filled
            mode="island"
            header={<CellHeader titleStyle="caps">Контактная информация</CellHeader>}
            style={{ marginTop: 20 }}
          >
            <CellSimple
              title="Email"
              subtitle={profileData.email}
            />
            <CellSimple
              title="Телефон"
              subtitle={profileData.phone}
            />
          </CellList>
        </Container>
      </Flex>
    </Panel>
  );
}
