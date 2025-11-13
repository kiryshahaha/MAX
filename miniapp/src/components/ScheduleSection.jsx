import { useRouter } from "next/navigation";
import {
  CellList,
  CellHeader,
  CellSimple,
  Dot,
  Spinner
} from "@maxhub/max-ui";
import { Steps } from "antd";

const ScheduleSection = ({ todaySchedule, scheduleLoading, user, onRefreshSchedule }) => {
  const router = useRouter();

  const calculateActivePairProgress = (schedule) => {
    if (!schedule || !schedule.schedule) return undefined;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const classItem of schedule.schedule) {
      if (classItem.timeRange) {
        const [startTime, endTime] = classItem.timeRange.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (currentTime >= startMinutes && currentTime <= endMinutes) {
          const totalDuration = endMinutes - startMinutes;
          const elapsed = currentTime - startMinutes;
          return Math.min(Math.round((elapsed / totalDuration) * 100), 100);
        }
      }
    }

    return undefined;
  };

  const formatScheduleForSteps = (schedule) => {
    if (!schedule || !schedule.schedule || schedule.schedule.length === 0) return [];

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return schedule.schedule.map((classItem, index) => {
      let status = "wait";
      let percent = undefined;

      if (classItem.timeRange) {
        const [startTime, endTime] = classItem.timeRange.split('-');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (currentTime < startMinutes) {
          status = "wait";
        } else if (currentTime >= startMinutes && currentTime <= endMinutes) {
          status = "process";
          const totalDuration = endMinutes - startMinutes;
          const elapsed = currentTime - startMinutes;
          percent = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
        } else {
          status = "finish";
        }
      }

      return {
        title: classItem.subject || 'Не указано',
        description: `${classItem.type || ''}${classItem.timeRange ? ` • ${classItem.timeRange}` : ''}${classItem.building ? `, ${classItem.building}` : ''}${classItem.location ? `, ${classItem.location}` : ''}`,
        subTitle: classItem.pairNumber ? `${classItem.pairNumber}` : '',
        status,
        percent
      };
    });
  };

  return (
    <CellList
      filled
      mode="island"
      header={
        <CellHeader
          titleStyle="caps"
          after={
            <Dot
              appearance={
                todaySchedule?.metadata?.is_even_week !== undefined
                  ? (todaySchedule.metadata.is_even_week ? 'themed' : 'accent-red')
                  : 'accent-red'
              }
            ></Dot>
          }
        >
          Расписание на сегодня {todaySchedule?.date_dd_mm}
        </CellHeader>
      }
    >
      {scheduleLoading ? (
        <CellSimple><Spinner /></CellSimple>
      ) : todaySchedule ? (
        todaySchedule.schedule.length > 0 ? (
          <CellSimple showChevron onClick={() => router.push('/schedule/week')}>
            <Steps
              direction="vertical"
              items={formatScheduleForSteps(todaySchedule)}
              percent={calculateActivePairProgress(todaySchedule)}
            />
          </CellSimple>
        ) : (
          <CellSimple>
            На сегодня занятий нет
            <Button
              type="link"
              onClick={onRefreshSchedule}
              style={{ marginTop: '10px' }}
              disabled={scheduleLoading}
            >
              Обновить
            </Button>
          </CellSimple>
        )
      ) : (
        <CellSimple>
          Расписание не загружено
          <Button
            type="link"
            onClick={onRefreshSchedule}
            style={{ marginTop: '10px' }}
            disabled={scheduleLoading}
          >
            Загрузить
          </Button>
        </CellSimple>
      )}
    </CellList>
  );
};

export default ScheduleSection;