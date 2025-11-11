import styles from './TasksTable.module.css';

export default function TasksTable({ tasks, getTaskStatusClass, getDeadlineClass }) {
  return (
    <div className={styles.tasksContainer}>
      <div className={styles.tasksHeader}>
        <h3 className={styles.tasksTitle}>Найдено заданий: {tasks.length}</h3>
      </div>
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
                  {task.subject?.link ? (
                    <a 
                      href={task.subject.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.subjectLink}
                    >
                      {task.subject.name}
                    </a>
                  ) : (
                    task.subject?.name
                  )}
                </td>
                <td className={styles.numberCell}>
                  {task.task?.number}
                </td>
                <td>
                  {task.task?.link ? (
                    <a 
                      href={task.task.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.taskLink}
                    >
                      {task.task.name}
                    </a>
                  ) : (
                    task.task?.name
                  )}
                </td>
                <td>
                  <span className={getTaskStatusClass(task.status?.code)}>
                    {task.status?.text}
                  </span>
                </td>
                <td className={styles.scoreCell}>
                  {task.score?.achieved}/{task.score?.max}
                </td>
                <td>
                  {task.task?.type}
                </td>
                <td className={getDeadlineClass(task.deadline?.text)}>
                  {task.deadline?.text}
                </td>
                <td className={styles.updatedAtCell}>
                  {task.task?.created_at}
                </td>
                <td>
                  {task.teacher?.link ? (
                    <a 
                      href={task.teacher.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.teacherLink}
                    >
                      {task.teacher.full_name}
                    </a>
                  ) : (
                    task.teacher?.full_name
                  )}
                </td>
                <td>
                  {task.task?.link && (
                    <a 
                      href={task.task.link} 
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
  );
}