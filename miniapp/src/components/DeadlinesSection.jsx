import {
  CellList,
  CellHeader,
  CellSimple,
  Spinner,
  Button,
  Flex
} from "@maxhub/max-ui";
import { Tag } from "antd";

const DeadlinesSection = ({ tasks, tasksLoading, onUpdateDeadlines }) => {
  // Функция для парсинга даты из текста
  const parseDate = (dateText) => {
    if (!dateText || dateText === 'Спи спокойно') return Infinity;

    try {
      const [day, month, year] = dateText.split('.').map(Number);
      return new Date(year, month - 1, day).getTime();
    } catch (error) {
      return Infinity;
    }
  };

  // Функция для форматирования дедлайнов
  const formatDeadlineTasks = (tasks) => {
    if (!tasks || !Array.isArray(tasks)) return [];

    return tasks
      .filter(task => {
        // Фильтруем задачи с валидными дедлайнами (не "Спи спокойно")
        const deadlineText = task.deadline?.text;
        const hasValidDeadline = deadlineText && deadlineText !== 'Спи спокойно';

        // ИСКЛЮЧАЕМ задачи со статусом "принят" или "ожидает проверки"
        const status = task.status?.text?.toLowerCase();
        const hasExcludingStatus = status === 'принят' || status === 'ожидает проверки';

        return hasValidDeadline && !hasExcludingStatus;
      })
      .sort((a, b) => {
        // Сортируем по дате дедлайна
        const dateA = parseDate(a.deadline.text);
        const dateB = parseDate(b.deadline.text);
        return dateA - dateB;
      })
      .slice(0, 25); // Берем ближайшие дедлайны
  };

  const getDeadlineTagColor = (deadlineText) => {
    if (!deadlineText || deadlineText === 'Спи спокойно') return 'default';

    try {
      const [day, month, year] = deadlineText.split('.').map(Number);
      const deadlineDate = new Date(year, month - 1, day);
      const today = new Date();
      const timeDiff = deadlineDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysDiff < 0) return 'error'; // Просрочено
      if (daysDiff <= 3) return 'error'; // Меньше 3 дней
      if (daysDiff <= 7) return 'warning'; // Меньше недели
      return 'success'; // Больше недели
    } catch (error) {
      return 'default';
    }
  };

  return (
    <CellList
      filled
      mode="island"
      header={
        <CellHeader titleStyle="caps">
          <Flex direction="row" align="center" justify="space-between">
            <span>Ближайшие дедлайны</span>
            <Button
              type="link"
              onClick={onUpdateDeadlines}
              disabled={tasksLoading}
              style={{ fontSize: '12px' }}
            >
              {tasksLoading ? <Spinner /> : 'Обновить'}
            </Button>
          </Flex>
        </CellHeader>
      }
    >
      {tasksLoading ? (
        <CellSimple><Spinner /></CellSimple>
      ) : formatDeadlineTasks(tasks).length > 0 ? (
        formatDeadlineTasks(tasks).map((task, index) => (
          <CellSimple
            key={index}
            after={
              <Tag color={getDeadlineTagColor(task.deadline?.text)}>
                {task.deadline?.text}
              </Tag>
            }
            title={task.subject?.name || 'Не указано'}
            subtitle={task.task?.name || task.task?.title || 'Без названия'}
          ></CellSimple>
        ))
      ) : (
        <CellSimple>
          Нет ближайших дедлайнов
          <Button
            type="link"
            onClick={onUpdateDeadlines}
            style={{ marginTop: '10px' }}
            disabled={tasksLoading}
          >
            Загрузить задачи
          </Button>
        </CellSimple>
      )}
    </CellList>
  );
};

export default DeadlinesSection;