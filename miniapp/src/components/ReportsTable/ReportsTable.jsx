import styles from './ReportsTable.module.css';

export default function ReportsTable({ reports, getReportStatusClass }) {
  return (
    <div className={styles.reportsContainer}>
      <div className={styles.reportsHeader}>
        <h3 className={styles.reportsTitle}>Найдено отчетов: {reports.length}</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Действия</th>
              <th>№</th>
              <th>Задание</th>
              <th>Преподаватель</th>
              <th>Статус</th>
              <th>Баллы</th>
              <th>Дата загрузки</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, index) => (
              <tr key={index}>
                <td>
                  <div className={styles.reportActions}>
                    {report.attachments?.download_url && (
                      <a 
                        href={report.attachments.download_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.downloadLink}
                        title="Скачать отчет"
                      >
                        📥
                      </a>
                    )}
                  </div>
                </td>
                <td className={styles.numberCell}>
                  {report.task?.number}
                </td>
                <td>
                  {report.task?.link ? (
                    <a 
                      href={report.task.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.taskLink}
                    >
                      {report.task.name}
                    </a>
                  ) : (
                    report.task?.name
                  )}
                </td>
                <td>
                  {report.teacher?.link ? (
                    <a 
                      href={report.teacher.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.teacherLink}
                    >
                      {report.teacher.full_name}
                    </a>
                  ) : (
                    report.teacher?.full_name
                  )}
                </td>
                <td>
                  <span className={getReportStatusClass(report.status?.code)}>
                    {report.status?.text}
                  </span>
                </td>
                <td className={styles.scoreCell}>
                  {report.score?.is_empty ? '―' : `${report.score.achieved}/${report.score.max}`}
                </td>
                <td className={styles.uploadDateCell}>
                  {report.load_date?.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}