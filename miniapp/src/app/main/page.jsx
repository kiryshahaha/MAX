"use client";
import {
  Avatar,
  Button,
  CellHeader,
  CellList,
  CellSimple,
  Container,
  EllipsisText,
  Flex,
  Panel,
  ToolButton,
  Typography,
} from "@maxhub/max-ui";
import { Tag } from "antd";
import React from "react";
const { Headline } = Typography;
export default function MainPage() {
  return (
    <Panel mode="secondary" className="wrap">
      <Flex direction="column" align="stretch" gap={30}>
        <Container fullWidth>
          <CellList
            filled
            mode="island"
            header={<CellHeader titleStyle="caps">Расписание</CellHeader>}
          >
            <CellSimple
              before={<Button onClick={() => alert("He")}>Hello</Button>}
              title="Математика"
              showChevron
            ></CellSimple>
          </CellList>
        </Container>

        <Container fullWidth>
          <CellList
            filled
            mode="island"
            header={
              <CellHeader titleStyle="caps">Ближайшие дедлайны</CellHeader>
            }
          >
            <CellSimple
              before={<Button onClick={() => alert("He")}>09.11</Button>}
              title="Математика"
              showChevron
            ></CellSimple>
          </CellList>
        </Container>
        <Container fullWidth>
          <CellList
            filled
            mode="island"
            header={<CellHeader titleStyle="caps">Уведомления</CellHeader>}
          >
            <CellSimple
              title="Алгоритмы и структуры данных"
              after={<Tag color="error">Отклонен</Tag>}
            >
              <a
                href="https://pro.guap.ru/inside/student/tasks/168453"
                rel="noreferrer"
                target="_blank"
              >
                <EllipsisText maxLines={1}>
                  ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
                </EllipsisText>
              </a>
            </CellSimple>
            <CellSimple
              title="Алгоритмы и структуры данных"
              after={<Tag color="orange">Ожидает</Tag>}
            >
              <a
                href="https://pro.guap.ru/inside/student/tasks/168453"
                rel="noreferrer"
                target="_blank"
              >
                <EllipsisText maxLines={1}>
                  ЛАБОРАТОРНАЯ РАБОТА №1 «АНАЛИЗ СЛОЖНОСТИ АЛГОРИТМОВ»
                </EllipsisText>
              </a>
            </CellSimple>
          </CellList>
        </Container>
      </Flex>
    </Panel>
  );
}
