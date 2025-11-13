import {
  CellList,
  CellHeader,
  CellSimple,
  EllipsisText
} from "@maxhub/max-ui";
import { Badge } from "antd";

const NotificationsSection = () => {
  return (
    <CellList
      filled
      mode="island"
      header={<CellHeader titleStyle="caps">Уведомления</CellHeader>}
    >
      <CellSimple
        title="Алгоритмы и структуры данных"
        after={<Badge status="error"></Badge>}
        subtitle={
          <a
            href="https://pro.guap.ru/inside/student/tasks/168453"
            rel="noreferrer"
            target="_blank"
          >
            <EllipsisText maxLines={1}>
              ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
            </EllipsisText>
          </a>
        }
      ></CellSimple>
      <CellSimple
        title="Алгоритмы и структуры данных"
        after={<Badge status="warning"></Badge>}
        subtitle={
          <a
            href="https://pro.guap.ru/inside/student/tasks/168453"
            rel="noreferrer"
            target="_blank"
          >
            <EllipsisText maxLines={1}>
              ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
            </EllipsisText>
          </a>
        }
      ></CellSimple>
      <CellSimple
        title="Алгоритмы и структуры данных"
        after={<Badge status="warning"></Badge>}
        subtitle={
          <a
            href="https://pro.guap.ru/inside/student/tasks/168453"
            rel="noreferrer"
            target="_blank"
          >
            <EllipsisText maxLines={1}>
              ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
            </EllipsisText>
          </a>
        }
      ></CellSimple>
    </CellList>
  );
};

export default NotificationsSection;