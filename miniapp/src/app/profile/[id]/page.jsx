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

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

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
        
        // Автоматически запускаем парсер если профиль пустой
        if (isEmptyProfile(data.profile)) {
          console.log('🔄 Профиль пустой, запускаем автоматическое обновление...');
          await handleAutoUpdateProfile();
        }
      } else {
        setProfile(null);
      }

    } catch (err) {
      console.error('❌ Ошибка загрузки профиля:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Проверяем, пустой ли профиль
  const isEmptyProfile = (profileData) => {
    if (!profileData) return true;
    
    // Если профиль в новой структуре (из парсера)
    if (profileData.personal_info) {
      return !profileData.personal_info.full_name && 
             !profileData.academic_info?.group;
    }
    
    // Если профиль в старой структуре
    return !profileData.fullName && !profileData.group;
  };

  // Автоматическое обновление профиля (без показа спиннера для пользователя)
  const handleAutoUpdateProfile = async () => {
    try {
      setAutoUpdating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return; // Не выбрасываем ошибку, чтобы не прерывать основной поток
      }

      const userId = session.user.id;
      const username = session.user.user_metadata?.guap_username || 
                      session.user.user_metadata?.original_username || 
                      session.user.user_metadata?.username;
      const password = session.user.user_metadata?.guap_password;

      if (!username || !password) {
        console.log('⚠️ Нет данных для автоматического обновления');
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
        console.error('❌ Ошибка автоматического обновления профиля:', response.status);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
        console.log('✅ Профиль автоматически обновлен');
      } else {
        console.error('❌ Ошибка автоматического обновления:', data.message);
      }

    } catch (err) {
      console.error('❌ Ошибка автоматического обновления профиля:', err);
      // Не устанавливаем ошибку в state, чтобы не показывать пользователю
    } finally {
      setAutoUpdating(false);
    }
  };

  // Ручное обновление профиля (с показом спиннера)
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
      const password = session.user.user_metadata?.guap_password;

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

  // Функция для преобразования структуры профиля
  const getProfileData = () => {
    if (!profile) return null;

    // Если профиль уже в плоской структуре (старый формат)
    if (profile.fullName) {
      return profile;
    }

    // Преобразуем новую структуру в плоскую
    return {
      fullName: profile.personal_info?.full_name || 'Не указано',
      group: profile.academic_info?.group || 'Не указано',
      status: profile.academic_info?.status || 'Не указано',
      studentId: profile.personal_info?.student_id || 'Не указано',
      direction: profile.program_info?.direction || 'Не указано',
      institute: profile.program_info?.institute || 'Не указано',
      specialty: profile.program_info?.specialty?.name || profile.program_info?.specialty?.full_name || 'Не указано',
      educationForm: profile.academic_info?.education_form || 'Не указано',
      contacts: {
        email: profile.contacts?.primary_email || profile.contacts?.secondary_email || 'Не указано',
        phone: profile.contacts?.phone || 'Не указано'
      }
    };
  };

  const profileData = getProfileData();

  // Комбинированная загрузка (начальная + автоматическое обновление)
  const isLoading = loading || autoUpdating;

  if (isLoading) {
    return (
      <Panel mode="secondary">
        <Flex direction="column" gap={20} align="center" justify="center" style={{ minHeight: '200px' }}>
          <Spinner />
          <EllipsisText>
            {autoUpdating ? 'Автоматическое обновление профиля...' : 'Загрузка профиля...'}
          </EllipsisText>
        </Flex>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel mode="secondary">
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
      </Panel>
    );
  }

  if (!profileData || isEmptyProfile(profile)) {
    return (
      <Panel mode="secondary">
        <Flex direction="column" gap={20} align="center" justify="center" style={{ minHeight: '200px' }}>
          <EllipsisText>Профиль не найден или пустой</EllipsisText>
          <Flex gap={10}>
            <Button onClick={fetchProfile}>
              Загрузить профиль
            </Button>
            <Button onClick={handleUpdateProfile} disabled={updating}>
              {updating ? <Spinner  /> : 'Обновить данные'}
            </Button>
          </Flex>
        </Flex>
      </Panel>
    );
  }

  return (
    <Panel mode="secondary">
      <Flex direction="column" gap={20} align="center">
        <Flex direction="column" gap={10} align="center">
          <CellHeader
            title={profileData.fullName}
            description={profileData.group}
            // size="large"
          />
          <Button 
            onClick={handleUpdateProfile} 
            disabled={updating}
            size="small"
          >
            {updating ? <Spinner  /> : 'Обновить данные'}
          </Button>
        </Flex>
        
        <CellList>
          <CellSimple
            title="Статус"
            description={profileData.status}
          />
          <CellSimple
            title="Студенческий билет"
            description={profileData.studentId}
          />
          <CellSimple
            title="Направление"
            description={profileData.direction}
          />
          <CellSimple
            title="Институт"
            description={profileData.institute}
          />
          <CellSimple
            title="Специальность"
            description={profileData.specialty}
          />
          <CellSimple
            title="Email"
            description={profileData.contacts?.email}
          />
          <CellSimple
            title="Телефон"
            description={profileData.contacts?.phone}
          />
          <CellSimple
            title="Форма обучения"
            description={profileData.educationForm}
          />
        </CellList>
      </Flex>
    </Panel>
  );
}