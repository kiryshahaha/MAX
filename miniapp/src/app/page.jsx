// page.jsx
'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import TasksTable from '@/components/TasksTable/TasksTable';
import ReportsTable from '@/components/ReportsTable/ReportsTable';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [marks, setMarks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleParams, setScheduleParams] = useState({
    year: 2025,
    week: 44
  });
  const [marksParams, setMarksParams] = useState({
    semester: '3',
    contrType: '0',
    teacher: '0',
    mark: '0'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setStatus('❌ Введите логин и пароль');
      return;
    }

    setIsLoading(true);
    setStatus('⏳ Выполняется вход и получение данных...');

    try {
      let endpoint;
      let body;

      if (activeTab === 'schedule') {
        endpoint = '/api/post-schedule';
        body = JSON.stringify({
          username,
          password,
          year: scheduleParams.year,
          week: scheduleParams.week
        });
      } else if (activeTab === 'marks') {
        endpoint = '/api/post-marks';
        body = JSON.stringify({
          username,
          password,
          semester: marksParams.semester,
          contrType: marksParams.contrType,
          teacher: marksParams.teacher,
          mark: marksParams.mark
        });
      } else {
        endpoint = activeTab === 'tasks' ? '/api/post-tasks' :
          activeTab === 'reports' ? '/api/post-reports' :
            '/api/post-profile';
        body = JSON.stringify({ username, password });
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        if (activeTab === 'tasks' && data.tasks) {
          setTasks(data.tasks);
          setStatus(`✅ Получено ${data.tasks.length} задач`);
        } else if (activeTab === 'reports' && data.reports) {
          setReports(data.reports);
          setStatus(`✅ Получено ${data.reports.length} отчетов`);
        } else if (activeTab === 'marks' && data.marks) {
          setMarks(data.marks);
          setStatus(`✅ Получено ${data.marks.length} оценок`);
        } else if (activeTab === 'profile' && data.profile) {
          setProfile(data.profile);
          setStatus(`✅ Профиль успешно получен`);
        } else if (activeTab === 'schedule' && data.schedule) {
          setSchedule(data.schedule);
          const totalClasses = (data.schedule.regularClasses?.length || 0) + (data.schedule.extraClasses?.length || 0);
          setStatus(`✅ Расписание получено (${totalClasses} занятий)`);
        } else {
          setStatus(data.message || 'Данные успешно получены');
        }
      } else {
        setStatus(`❌ ${data.message || 'Ошибка получения данных'}`);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setStatus(`❌ Ошибка: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    if (!username || !password) {
      setStatus('❌ Для обновления данных введите логин и пароль');
      return;
    }

    setIsLoading(true);
    setStatus('⏳ Обновляем данные...');

    try {
      let endpoint;
      let body;

      if (activeTab === 'schedule') {
        endpoint = '/api/post-schedule';
        body = JSON.stringify({
          username,
          password,
          year: scheduleParams.year,
          week: scheduleParams.week
        });
      } else if (activeTab === 'marks') {
        endpoint = '/api/post-marks';
        body = JSON.stringify({
          username,
          password,
          semester: marksParams.semester,
          contrType: marksParams.contrType,
          teacher: marksParams.teacher,
          mark: marksParams.mark
        });
      } else {
        endpoint = activeTab === 'tasks' ? '/api/post-tasks' :
          activeTab === 'reports' ? '/api/post-reports' :
            '/api/post-profile';
        body = JSON.stringify({ username, password });
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        if (activeTab === 'tasks' && data.tasks) {
          setTasks(data.tasks);
          setStatus(`✅ Обновлено ${data.tasks.length} задач`);
        } else if (activeTab === 'reports' && data.reports) {
          setReports(data.reports);
          setStatus(`✅ Обновлено ${data.reports.length} отчетов`);
        } else if (activeTab === 'marks' && data.marks) {
          setMarks(data.marks);
          setStatus(`✅ Обновлено ${data.marks.length} оценок`);
        } else if (activeTab === 'profile' && data.profile) {
          setProfile(data.profile);
          setStatus(`✅ Профиль успешно обновлен`);
        } else if (activeTab === 'schedule' && data.schedule) {
          setSchedule(data.schedule);
          const totalClasses = (data.schedule.regularClasses?.length || 0) + (data.schedule.extraClasses?.length || 0);
          setStatus(`✅ Расписание обновлено (${totalClasses} занятий)`);
        } else {
          setStatus(data.message || 'Данные успешно обновлены');
        }
      } else {
        setStatus(`❌ ${data.message || 'Ошибка обновления данных'}`);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setStatus(`❌ Ошибка обновления: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleParamChange = (param, value) => {
    setScheduleParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleMarksParamChange = (param, value) => {
    setMarksParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const getStatusClass = () => {
    if (status.includes('✅')) return styles.statusSuccess;
    if (status.includes('❌')) return styles.statusError;
    if (status.includes('⏳')) return styles.statusLoading;
    return '';
  };

  const getTaskStatusClass = (statusClass) => {
    if (statusClass.includes('bg-success')) return styles.statusSuccess;
    if (statusClass.includes('bg-warning')) return styles.statusWarning;
    if (statusClass.includes('bg-danger')) return styles.statusError;
    return styles.statusDefault;
  };

  const getReportStatusClass = (statusClass) => {
    if (statusClass.includes('bg-success')) return styles.statusSuccess;
    if (statusClass.includes('bg-warning')) return styles.statusWarning;
    if (statusClass.includes('bg-danger')) return styles.statusError;
    return styles.statusDefault;
  };

  const getDeadlineClass = (deadlineClass) => {
    if (deadlineClass.includes('text-warning')) return styles.deadlineWarning;
    if (deadlineClass.includes('text-danger')) return styles.deadlineError;
    return styles.deadlineDefault;
  };

  const getScheduleTypeClass = (type) => {
    switch (type) {
      case 'Л': return styles.scheduleLecture;
      case 'Пр': return styles.schedulePractice;
      case 'ЛР': return styles.scheduleLab;
      case 'КР': return styles.scheduleCourse;
      default: return styles.scheduleDefault;
    }
  };

  const getMarkColor = (markValue) => {
    const markColors = {
      'н/я': '#6B7280',
      'неудовл.': '#EF4444',
      'удовл.': '#F59E0B',
      'хорошо': '#10B981',
      'отлично': '#059669',
      'незачет': '#EF4444',
      'зачет': '#10B981',
      'освобождение': '#3B82F6',
      'нет': '#6B7280'
    };
    return markColors[markValue] || '#6B7280';
  };

  const getTotalClassesCount = () => {
    if (!schedule) return 0;
    return (schedule.regularClasses?.length || 0) + (schedule.extraClasses?.length || 0);
  };

  const getTotalCredits = () => {
    return marks.reduce((total, mark) => total + (mark.creditsValue || 0), 0);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Вход в ЛК ГУАП</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
        />

        {/* Параметры расписания (только для вкладки расписания) */}
        {activeTab === 'schedule' && (
          <div className={styles.scheduleParams}>
            <div className={styles.paramGroup}>
              <label className={styles.paramLabel}>Год:</label>
              <input
                type="number"
                value={scheduleParams.year}
                onChange={(e) => handleScheduleParamChange('year', parseInt(e.target.value))}
                className={styles.paramInput}
                min="2024"
                max="2030"
              />
            </div>
            <div className={styles.paramGroup}>
              <label className={styles.paramLabel}>Неделя:</label>
              <input
                type="number"
                value={scheduleParams.week}
                onChange={(e) => handleScheduleParamChange('week', parseInt(e.target.value))}
                className={styles.paramInput}
                min="1"
                max="52"
              />
            </div>
          </div>
        )}

        {/* Параметры оценок (только для вкладки оценок) */}
        {activeTab === 'marks' && (
          <div className={styles.marksParams}>
            <div className={styles.paramGroup}>
              <label className={styles.paramLabel}>Семестр:</label>
              <select
                value={marksParams.semester}
                onChange={(e) => handleMarksParamChange('semester', e.target.value)}
                className={styles.paramSelect}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </select>
            </div>
            <div className={styles.paramGroup}>
              <label className={styles.paramLabel}>Тип контроля:</label>
              <select
                value={marksParams.contrType}
                onChange={(e) => handleMarksParamChange('contrType', e.target.value)}
                className={styles.paramSelect}
              >
                <option value="0">Все</option>
                <option value="1">Экзамен</option>
                <option value="2">Зачет</option>
                <option value="3">Курсовая работа</option>
                <option value="4">Курсовой проект</option>
                <option value="6">Дифференцированный зачет</option>
                <option value="7">Канд. экзамен</option>
              </select>
            </div>
            <div className={styles.paramGroup}>
              <label className={styles.paramLabel}>Оценка:</label>
              <select
                value={marksParams.mark}
                onChange={(e) => handleMarksParamChange('mark', e.target.value)}
                className={styles.paramSelect}
              >
                <option value="0">Все</option>
                <option value="1">н/я</option>
                <option value="2">неудовл.</option>
                <option value="3">удовл.</option>
                <option value="4">хорошо</option>
                <option value="5">отлично</option>
                <option value="6">незачет</option>
                <option value="7">зачет</option>
              </select>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={styles.button}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Загрузка...' : 'Войти и получить данные'}
        </button>
      </form>

      {/* Табы для переключения между задачами, отчетами, оценками, профилем и расписанием */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'tasks' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Задания ({tasks.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'reports' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Отчеты ({reports.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'marks' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('marks')}
        >
          Оценки ({marks.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Профиль ({profile ? '✓' : '0'})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'schedule' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Расписание ({getTotalClassesCount()})
        </button>
      </div>

      {status && (
        <div className={`${styles.status} ${getStatusClass()}`}>
          {status}
          {(tasks.length > 0 || reports.length > 0 || marks.length > 0 || profile || schedule) && (
            <button
              onClick={handleRefreshData}
              className={styles.refreshButton}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '🔄 Обновить'}
            </button>
          )}
        </div>
      )}

      {/* Блок задач */}
      {activeTab === 'tasks' && tasks.length > 0 && (
        <>
          <div className={styles.tasksHeader}>
            <h3 className={styles.tasksTitle}>Найдено заданий: {tasks.length}</h3>
            <button
              onClick={handleRefreshData}
              className={styles.refreshButtonLarge}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Обновление...' : '🔄 Обновить задачи'}
            </button>
          </div>
          <TasksTable
            tasks={tasks}
            getTaskStatusClass={getTaskStatusClass}
            getDeadlineClass={getDeadlineClass}
          />
        </>
      )}

      {/* Блок отчетов */}
      {activeTab === 'reports' && reports.length > 0 && (
        <>
          <div className={styles.reportsHeader}>
            <h3 className={styles.reportsTitle}>Найдено отчетов: {reports.length}</h3>
            <button
              onClick={handleRefreshData}
              className={styles.refreshButtonLarge}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Обновление...' : '🔄 Обновить отчеты'}
            </button>
          </div>
          <ReportsTable
            reports={reports}
            getReportStatusClass={getReportStatusClass}
          />
        </>
      )}

      {/* Блок оценок */}
      {activeTab === 'marks' && marks.length > 0 && (
        <>
          <div className={styles.marksHeader}>
            <div className={styles.marksInfo}>
              <h3 className={styles.marksTitle}>
                Оценки за {marksParams.semester} семестр
              </h3>
              <div className={styles.marksStats}>
                Предметов: {marks.length} | Зачетных единиц: {getTotalCredits()}
              </div>
            </div>
            <button
              onClick={handleRefreshData}
              className={styles.refreshButtonLarge}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Обновление...' : '🔄 Обновить оценки'}
            </button>
          </div>
          <div className={styles.marksGrid}>
            {marks.map((mark, index) => (
              <div key={index} className={styles.markCard}>
                <div className={styles.markHeader}>
                  <h4 className={styles.markSubject}>
                    <a 
                      href={`https://pro.guap.ru${mark.subject.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.markLink}
                    >
                      {mark.subject.name}
                    </a>
                  </h4>
                  <div 
                    className={styles.markBadge}
                    style={{ backgroundColor: getMarkColor(mark.mark.value) }}
                  >
                    {mark.mark.value}
                  </div>
                </div>
                
                <div className={styles.markDetails}>
                  <div className={styles.markDetail}>
                    <span className={styles.detailLabel}>Тип контроля:</span>
                    <span className={styles.detailValue}>{mark.controlType}</span>
                  </div>
                  
                  <div className={styles.markDetail}>
                    <span className={styles.detailLabel}>Преподаватели:</span>
                    <div className={styles.teachersList}>
                      {mark.teachers.map((teacher, teacherIndex) => (
                        <span key={teacherIndex} className={styles.teacher}>
                          {teacher.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {mark.credits && (
                    <div className={styles.markDetail}>
                      <span className={styles.detailLabel}>Зачетные единицы:</span>
                      <span className={styles.credits}>{mark.credits}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Блок профиля */}
      {activeTab === 'profile' && profile && (
        <>
          <div className={styles.profileHeader}>
            <h3 className={styles.profileTitle}>Профиль пользователя</h3>
            <button
              onClick={handleRefreshData}
              className={styles.refreshButtonLarge}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Обновление...' : '🔄 Обновить профиль'}
            </button>
          </div>
          <div className={styles.profileCard}>
            <div className={styles.profileSection}>
              <h4 className={styles.profileSectionTitle}>Основная информация</h4>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>ФИО:</span>
                <span className={styles.fieldValue}>{profile.fullName}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Институт/факультет:</span>
                <span className={styles.fieldValue}>{profile.institute}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Группа:</span>
                <span className={styles.fieldValue}>{profile.group}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Студенческий билет:</span>
                <span className={styles.fieldValue}>{profile.studentId}</span>
              </div>
            </div>

            <div className={styles.profileSection}>
              <h4 className={styles.profileSectionTitle}>Образовательная информация</h4>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Специальность:</span>
                <span className={styles.fieldValue}>{profile.specialty}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Направленность:</span>
                <span className={styles.fieldValue}>{profile.direction}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Форма обучения:</span>
                <span className={styles.fieldValue}>{profile.educationForm}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Уровень образования:</span>
                <span className={styles.fieldValue}>{profile.educationLevel}</span>
              </div>
              <div className={styles.profileField}>
                <span className={styles.fieldLabel}>Статус:</span>
                <span className={styles.fieldValue}>{profile.status}</span>
              </div>
            </div>

            {profile.contacts && (
              <div className={styles.profileSection}>
                <h4 className={styles.profileSectionTitle}>Контактная информация</h4>
                {profile.contacts.email && (
                  <div className={styles.profileField}>
                    <span className={styles.fieldLabel}>Email:</span>
                    <span className={styles.fieldValue}>{profile.contacts.email}</span>
                  </div>
                )}
                {profile.contacts.accountEmail && (
                  <div className={styles.profileField}>
                    <span className={styles.fieldLabel}>Почта аккаунта:</span>
                    <span className={styles.fieldValue}>{profile.contacts.accountEmail}</span>
                  </div>
                )}
                {profile.contacts.phone && (
                  <div className={styles.profileField}>
                    <span className={styles.fieldLabel}>Телефон:</span>
                    <span className={styles.fieldValue}>{profile.contacts.phone}</span>
                  </div>
                )}
              </div>
            )}

            {profile.currentCabinet && (
              <div className={styles.profileSection}>
                <h4 className={styles.profileSectionTitle}>Текущий личный кабинет</h4>
                <div className={styles.profileField}>
                  <span className={styles.fieldValue}>{profile.currentCabinet.label}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Блок расписания */}
      {activeTab === 'schedule' && schedule && (
        <>
          <div className={styles.scheduleHeader}>
            <div className={styles.scheduleInfo}>
              <h3 className={styles.scheduleTitle}>
                Расписание на {scheduleParams.year} год, неделя {scheduleParams.week}
              </h3>
              <div className={styles.scheduleStats}>
                Регулярных занятий: {schedule.regularClasses?.length || 0} |
                Вне сетки: {schedule.extraClasses?.length || 0}
              </div>
            </div>
            <button
              onClick={handleRefreshData}
              className={styles.refreshButtonLarge}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Обновление...' : '🔄 Обновить расписание'}
            </button>
          </div>

          {schedule.days && schedule.days.length > 0 && (
            <div className={styles.scheduleSection}>
              <h4 className={styles.scheduleSectionTitle}>Основное расписание</h4>
              <div className={styles.scheduleTable}>
                {schedule.days.map((day, dayIndex) => (
                  <div key={dayIndex}>
                    {/* Заголовок дня */}
                    <div className={styles.dayHeader}>
                      <h5 className={styles.dayTitle}>
                        {day.dayName} - {day.date}
                        {day.fullDate && (
                          <span className={styles.fullDate}>({day.fullDate})</span>
                        )}
                      </h5>
                      <span className={styles.dayClassesCount}>
                        {day.classes.length} занятий
                      </span>
                    </div>
                    
                    {/* Занятия дня */}
                    {day.classes.map((classItem, classIndex) => (
                      <div key={classIndex} className={styles.scheduleItem}>
                        <div className={styles.classHeader}>
                          <span className={`${styles.classType} ${getScheduleTypeClass(classItem.type)}`}>
                            {classItem.type}
                          </span>
                          <span className={styles.classTime}>
                            {classItem.pairNumber} пара ({classItem.timeRange})
                          </span>
                        </div>
                        <div className={styles.classBody}>
                          <div className={styles.classSubject}>{classItem.subject}</div>
                          {classItem.teacher && (
                            <div className={styles.classTeacher}>
                              <span className={styles.teacherIcon}>👤</span>
                              {classItem.teacher}
                              {classItem.teacherInfo && (
                                <span className={styles.teacherInfo}> ({classItem.teacherInfo})</span>
                              )}
                            </div>
                          )}
                          {classItem.location && (
                            <div className={styles.classLocation}>
                              <span className={styles.locationIcon}>📍</span>
                              {classItem.location}
                            </div>
                          )}
                          {classItem.group && (
                            <div className={styles.classGroup}>
                              Группа: {classItem.group}
                            </div>
                          )}
                          {/* Форматированный текст */}
                          <div className={styles.formattedText}>
                            {classItem.formattedText}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Занятия вне сетки */}
          {schedule.extraClasses && schedule.extraClasses.length > 0 && (
            <div className={styles.scheduleSection}>
              <h4 className={styles.scheduleSectionTitle}>Занятия вне сетки расписания</h4>
              <div className={styles.scheduleTable}>
                {schedule.extraClasses.map((classItem, index) => (
                  <div key={index} className={styles.scheduleItem}>
                    <div className={styles.classHeader}>
                      <span className={`${styles.classType} ${getScheduleTypeClass(classItem.type)}`}>
                        {classItem.type}
                      </span>
                    </div>
                    <div className={styles.classBody}>
                      <div className={styles.classSubject}>{classItem.subject}</div>
                      {classItem.teacher && (
                        <div className={styles.classTeacher}>
                          <span className={styles.teacherIcon}>👤</span>
                          {classItem.teacher}
                          {classItem.teacherInfo && (
                            <span className={styles.teacherInfo}> ({classItem.teacherInfo})</span>
                          )}
                        </div>
                      )}
                      {classItem.group && (
                        <div className={styles.classGroup}>
                          Группа: {classItem.group}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}