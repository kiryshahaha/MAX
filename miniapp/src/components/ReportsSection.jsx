import {
  CellList,
  CellHeader,
  CellSimple,
  Spinner,
  Button,
  Flex
} from "@maxhub/max-ui";
import { Tag } from "antd";

const ReportsSection = ({ reports, reportsLoading, onUpdateReports }) => {
  const getReportTitle = (report) => {
    if (!report) return 'Без названия';
    return report.task?.name || 'Без названия';
  };

  const getReportTeacher = (report) => {
    if (!report) return 'Не указан';
    return report.teacher?.full_name || 'Не указан';
  };

  const formatReports = (reports) => {
    if (!reports || !Array.isArray(reports)) return { pending: [], recentProcessed: [] };

    const pendingReports = reports.filter(report => {
      const statusText = getReportStatusText(report.status);
      return statusText === 'Ожидает';
    });

    const processedReports = reports
      .filter(report => {
        const statusText = getReportStatusText(report.status);
        return statusText === 'Отклонен' || statusText === 'Принят';
      })
      .sort((a, b) => {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numB - numA;
      })
      .slice(0, 5);

    return {
      pending: pendingReports,
      recentProcessed: processedReports
    };
  };

  const getReportStatusColor = (status) => {
    const statusText = getReportStatusText(status);
    const statusLower = statusText.toLowerCase();

    switch (statusLower) {
      case 'ожидает':
        return 'processing';
      case 'принят':
        return 'success';
      case 'отклонен':
        return 'error';
      default:
        return 'default';
    }
  };

  const getReportStatusText = (status) => {
    if (!status) return 'Неизвестно';

    if (typeof status === 'string') {
      const statusLower = status.toLowerCase();
      switch (statusLower) {
        case 'ожидает проверки':
          return 'Ожидает';
        case 'принят':
          return 'Принят';
        case 'отклонен':
        case 'не принят':
          return 'Отклонен';
        default:
          return status;
      }
    }

    if (typeof status === 'object') {
      const statusValue = status.text || status.name || status.value || status.status;
      if (statusValue) {
        const statusLower = String(statusValue).toLowerCase();
        switch (statusLower) {
          case 'ожидает проверки':
            return 'Ожидает';
          case 'принят':
            return 'Принят';
          case 'отклонен':
          case 'не принят':
            return 'Отклонен';
          default:
            return String(statusValue);
        }
      }
    }

    return 'Неизвестно';
  };

  return (
    <CellList
      filled
      mode="island"
      header={
        <CellHeader titleStyle="caps">
          <Flex direction="row" align="center" justify="space-between">
            <span>Отчеты</span>

          </Flex>
        </CellHeader>
      }
    >
      {reportsLoading ? (
        <CellSimple><Spinner /></CellSimple>
      ) : reports.length > 0 ? (
        <>
          {formatReports(reports).pending.map((report, index) => (
            <CellSimple
              key={`pending-${index}`}
              after={
                <Tag color={getReportStatusColor(report.status)}>
                  {getReportStatusText(report.status)}
                </Tag>
              }
              title={getReportTitle(report)}
              subtitle={`Преподаватель: ${getReportTeacher(report)}`}
            ></CellSimple>
          ))}

          {formatReports(reports).recentProcessed.map((report, index) => (
            <CellSimple
              key={`processed-${index}`}
              after={
                <Tag color={getReportStatusColor(report.status)}>
                  {getReportStatusText(report.status)}
                </Tag>
              }
              title={getReportTitle(report)}
              subtitle={`Преподаватель: ${getReportTeacher(report)}`}
            ></CellSimple>
          ))}

          {formatReports(reports).pending.length === 0 && formatReports(reports).recentProcessed.length === 0 && (
            <CellSimple>Нет отчетов для отображения</CellSimple>
          )}
        </>
      ) : (
        <CellSimple>
          Отчеты не загружены
          <Button
            type="link"
            onClick={onUpdateReports}
            style={{ marginTop: '10px' }}
            disabled={reportsLoading}
          >
            Загрузить отчеты
          </Button>
        </CellSimple>
      )}
    </CellList>
  );
};

export default ReportsSection;