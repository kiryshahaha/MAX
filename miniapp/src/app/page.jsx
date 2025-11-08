'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [tasks, setTasks] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('⏳ Выполняется вход...');
    setTasks([]);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setStatus(data.message || 'Неизвестный ответ');
      
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Ошибка:', err);
      setStatus(`❌ Ошибка: ${err.message}`);
    }
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

  const getDeadlineClass = (deadlineClass) => {
    if (deadlineClass.includes('text-warning')) return styles.deadlineWarning;
    if (deadlineClass.includes('text-danger')) return styles.deadlineError;
    return styles.deadlineDefault;
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
        <button type="submit" className={styles.button}>
          Войти и получить задания
        </button>
      </form>
      
      {status && (
        <div className={`${styles.status} ${getStatusClass()}`}>
          {status}
        </div>
      )}

      {tasks.length > 0 && (
        <div className={styles.tasksContainer}>
          <h3 className={styles.tasksTitle}>Найдено заданий: {tasks.length}</h3>
          <div style={{ overflowX: 'auto' }}>
<table className={styles.table}>
  <thead>
    <tr>
      <th>Дисциплина</th>
      <th>Номер</th>
      <th>Название задания</th>
      <th>Статус</th>
      <th>Баллы</th>
      <th>Тип задания</th>
      <th>Доп. статус</th>
      <th>Дедлайн</th>
      <th>Обновлено</th>
      <th>Преподаватель</th>
      <th>Действие</th>
    </tr>
  </thead>
  <tbody>
    {tasks.map((task, index) => (
      <tr key={index}>
        <td>
          {task.subjectLink ? (
            <a 
              href={task.subjectLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.subjectLink}
            >
              {task.subject}
            </a>
          ) : (
            task.subject
          )}
        </td>
        <td className={styles.numberCell}>
          {task.taskNumber}
        </td>
        <td>
          {task.taskLink ? (
            <a 
              href={task.taskLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.taskLink}
            >
              {task.taskName}
            </a>
          ) : (
            task.taskName
          )}
        </td>
        <td>
          <span className={getTaskStatusClass(task.statusClass)}>
            {task.status}
          </span>
        </td>
        <td className={styles.scoreCell}>
          {task.score}
        </td>
        <td>
          {task.taskType}
        </td>
        <td>
          {task.additionalStatus}
        </td>
        <td className={getDeadlineClass(task.deadlineClass)}>
          {task.deadline}
        </td>
        <td className={styles.updatedAtCell}>
          {task.updatedAt}
        </td>
        <td>
          {task.teacherLink ? (
            <a 
              href={task.teacherLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.teacherLink}
            >
              {task.teacher}
            </a>
          ) : (
            task.teacher
          )}
        </td>
        <td>
          {task.actionButton && (
            <a 
              href={task.actionButton} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.actionLink}
              title="Просмотреть задание"
            >
              👁️
            </a>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>
          </div>
        </div>
      )}
    </div>
  );
}