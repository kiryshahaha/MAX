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
  Spinner,
  Avatar,
  Typography,
  Grid,
  ToolButton,
  CellAction,
  CellInput,
  Switch,
  IconButton,
  Counter
} from "@maxhub/max-ui";
import React, { useEffect, useState } from "react";

// Mock данные из JSON
const universityData = {
  university: {
    name: "Санкт-Петербургский государственный университет аэрокосмического приборостроения (ГУАП)",
    status: "Национальный исследовательский университет",
    founded: 1941,
    rector: "Антохина Юлия Анатольевна"
  },

  key_metrics: {
    total_students: 20150,
    academic_staff: 1200,
    annual_graduates: 3850,
    educational_programs: 200,
    qualified_professors_percentage: 70,
    campuses: 14,
    dormitories: 8
  },

  performance_metrics: {
    average_exam_score: 82.1,
    academic_performance: 96.2,
    average_grade: 4.21,
    employment_rate: 87,
    relevant_employment: 78
  },

  institutes: [
    {
      name: "Институт информационных систем и защиты информации (ИИСиЗИ)",
      students: 2900,
      growth: 7.4,
      average_score: 86.4,
      employment_rate: 94
    },
    {
      name: "Институт аэрокосмических приборов и систем (ИАПС)",
      students: 2700,
      growth: 1.9,
      average_score: 83.1,
      employment_rate: 83
    },
    {
      name: "Институт радиотехники, электроники и связи (ИРЭС)",
      students: 2500,
      growth: 2.5,
      average_score: 81.8,
      employment_rate: 85
    },
    {
      name: "Гуманитарный институт",
      students: 1800,
      growth: 0.8,
      average_score: 79.5,
      employment_rate: 72
    },
    {
      name: "Институт инновационных технологий в электромеханике и робототехнике (ИТиР)",
      students: 1600,
      growth: 3.2,
      average_score: 80.2
    }
  ],

  student_distribution: {
    bachelor_specialty: 15800,
    masters: 3900,
    postgraduate: 450,
    full_time: 14205,
    part_time: 5945
  },

  international_students: {
    total: 1712,
    percentage: 8.5,
    cis_countries: 68,
    asia: 22,
    other: 10
  },

  problem_areas: {
    academic_debt_students: 775,
    debt_percentage: 3.8,
    debt_by_year: {
      first_year: 15,
      second_year: 35,
      third_year: 25,
      fourth_plus_year: 25
    }
  },

  target_admission: {
    percentage: 22,
    partners: ["Российские космические системы", "ОДК", "Ленинец", "НИИ Вектор"]
  }
};

export default function UniversityDashboard() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Форматирование чисел
  const formatNumber = (num) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatPercentage = (num) => {
    return `${num}%`;
  };

  // Основные метрики для главного экрана
  const KeyMetricsCard = () => (
    // <Flex direction="column">
    //     <Typography.Headline variant="medium-strong">
    //       Ключевые показатели
    //     </Typography.Headline>

    <CellList 
    mode="island"
    header={<CellHeader>Ключевые показатели</CellHeader>}
    >
      <CellSimple
        // height="compact"
        title="Всего студентов"
        subtitle={formatNumber(universityData.key_metrics.total_students)}
      />
      <CellSimple
        // height="compact"
        title="Преподавателей"
        subtitle={formatNumber(universityData.key_metrics.academic_staff)}
      />
      <CellSimple
        height="compact"
        title="Выпускников в год"
        subtitle={formatNumber(universityData.key_metrics.annual_graduates)}
      />
      <CellSimple
        height="compact"
        title="Образовательных программ"
        subtitle={formatNumber(universityData.key_metrics.educational_programs)}
      />
    </CellList>
    // </Flex>
  );

  // Карточка качества образования
  const QualityMetricsCard = () => (
    // <Panel mode="island">
    //   <Flex direction="column" gap={16}>
    //     <Typography.Headline variant="medium-strong">
    //       Качество образования
    //     </Typography.Headline>
    //     <Flex gap={12}>

    <CellList 
    mode="island"
    header={<CellHeader>Качество образования</CellHeader>}
    >
      <CellSimple
        height="compact"
        title="Средний балл ЕГЭ"
        subtitle={universityData.performance_metrics.average_exam_score}
      />
      <CellSimple
        height="compact"
        title="Успеваемость"
        subtitle={formatPercentage(universityData.performance_metrics.academic_performance)}
      />
      <CellSimple
        height="compact"
        title="Трудоустройство"
        subtitle={formatPercentage(universityData.performance_metrics.employment_rate)}
      />
      <CellSimple
        height="compact"
        title="Трудоустройство по профилю"
        subtitle={formatPercentage(universityData.performance_metrics.relevant_employment)}
      />
    </CellList>
    //     </Flex>
    //   </Flex>
    // </Panel>
  );

  // Список институтов
  const InstitutesList = () => (
    // <Panel mode="island">
    //   <Flex direction="column" gap={16}>
    //     <Typography.Headline variant="medium-strong">
    //       Институты и факультеты
    //     </Typography.Headline>

    <CellList
      mode="island"
      header={<CellHeader>Институты и факультеты</CellHeader>}
    >
      {universityData.institutes.map((institute, index) => (
        <CellSimple
          key={index}
          height="compact"
          title={institute.name}
          subtitle={`${formatNumber(institute.students)} студентов · Рост ${institute.growth}%`}
          after={
            <Flex gap={8} align="center">
              {institute.average_score && (
                <Counter value={institute.average_score} rounded />
              )}
              {institute.employment_rate && (
                <Dot color="positive" />
              )}
            </Flex>
          }
        />
      ))}
    </CellList>
    //   </Flex>
    // </Panel>
  );

  // Распределение студентов
  const StudentDistributionCard = () => (

    <CellList
      mode="island"
      header={<CellHeader>Распределение студентов</CellHeader>}
    >
      <CellSimple
        height="compact"
        title="Бакалавриат/Специалитет"
        subtitle={formatNumber(universityData.student_distribution.bachelor_specialty)}
      />
      <CellSimple
        height="compact"
        title="Магистратура"
        subtitle={formatNumber(universityData.student_distribution.masters)}
      />
      <CellSimple
        height="compact"
        title="Очная форма"
        subtitle={formatNumber(universityData.student_distribution.full_time)}
      />
      <CellSimple
        height="compact"
        title="Заочная/Очно-заочная"
        subtitle={formatNumber(universityData.student_distribution.part_time)}
      />
    </CellList>

  );

  // Международные студенты
  const InternationalStudentsCard = () => (


    <CellList
      mode="island"
      header={<CellHeader>Международные студенты</CellHeader>}
    >
      <CellSimple
        height="compact"
        title="Всего иностранных студентов"
        subtitle={formatNumber(universityData.international_students.total)}
      />
      <CellSimple
        height="compact"
        title="Доля от общего числа"
        subtitle={formatPercentage(universityData.international_students.percentage)}
      />
      <CellSimple
        height="compact"
        title="Страны СНГ"
        subtitle={formatPercentage(universityData.international_students.cis_countries)}
      />
      <CellSimple
        height="compact"
        title="Страны Азии"
        subtitle={formatPercentage(universityData.international_students.asia)}
      />
    </CellList>

  );

  // Проблемные зоны
  const ProblemAreasCard = () => (


    <CellList
      mode="island"
      header={<CellHeader>Акдемические показатели</CellHeader>}
    >

      <CellSimple
        height="compact"
        title="Студентов с академической задолженностью"
        subtitle={`${formatNumber(universityData.problem_areas.academic_debt_students)} (${formatPercentage(universityData.problem_areas.debt_percentage)})`}
      />

      {/* <Typography.Body variant="small-strong">
          Распределение по курсам:
        </Typography.Body> */}
      {/* <Grid columns={2} gap={12}> */}
      <CellList
        header={<CellHeader>Распределение по курсам</CellHeader>}
      >
        <Grid cols={2} rows={2}>
          <CellSimple
            height="compact"
            title="1 курс"
            subtitle={formatPercentage(universityData.problem_areas.debt_by_year.first_year)}
          />
          <CellSimple
            height="compact"
            title="2 курс"
            subtitle={formatPercentage(universityData.problem_areas.debt_by_year.second_year)}
          />
          <CellSimple
            height="compact"
            title="3 курс"
            subtitle={formatPercentage(universityData.problem_areas.debt_by_year.third_year)}
          />
          <CellSimple
            height="compact"
            title="4+ курс"
            subtitle={formatPercentage(universityData.problem_areas.debt_by_year.fourth_plus_year)}
          />
        </Grid>
      </CellList>
      {/* </Grid> */}
    </CellList>

    //   </Flex>
    // </Panel>
  );

  // Целевой прием
  const TargetAdmissionCard = () => (
    // <Panel mode="island">
    //   <Flex direction="column" gap={16}>
    //     <Typography.Headline variant="medium-strong">
    //       Целевой прием
    //     </Typography.Headline>
    <>
      <CellList
        mode="island"
        header={<CellHeader>Целевой прием</CellHeader>}
      >
        <CellSimple
          height="compact"
          title="Доля целевиков от КЦП"
          subtitle={formatPercentage(universityData.target_admission.percentage)}
        />
      </CellList>

      {/* <Typography.Body variant="small-strong">
          Основные партнеры:
        </Typography.Body> */}
      <CellList
        mode="island"
        header={<CellHeader>Основные партнеры</CellHeader>}
      >
        <Flex direction="column" gap={8}>
          {universityData.target_admission.partners.map((partner, index) => (
            <CellSimple
              key={index}
              height="compact"
              title={partner}
            />
          ))}
        </Flex>
      </CellList>
    </>
    //   </Flex>
    // </Panel>
  );

  // Главный обзор
  const OverviewTab = () => (
    <Flex direction="column" gap={16}>
      <KeyMetricsCard />
      <QualityMetricsCard />
      <InstitutesList />
    </Flex>
  );

  // Студенты
  const   StudentsTab = () => (
    <Flex direction="column" gap={16}>
      <StudentDistributionCard />
      <InternationalStudentsCard />
      <ProblemAreasCard />
    </Flex>
  );

  // Партнеры
  const PartnersTab = () => (
    <Flex direction="column" gap={16}>
      <TargetAdmissionCard />
    </Flex>
  );

  return (
    <Panel mode="secondary" className="wrap">
      <Container>
        <Flex direction="column" gap={24}>
          {/* Заголовок */}
          <Flex direction="column" gap={8}>
            <Typography.Headline variant="large-strong">
              {universityData.university.name}
            </Typography.Headline>
            <Flex gap={12} align="center">
              <Typography.Body variant="small" appearance="neutral">
                {universityData.university.status}
              </Typography.Body>
              <Dot />
              <Typography.Body variant="small" appearance="neutral">
                Основан в {universityData.university.founded} году
              </Typography.Body>
              <Dot />
              <Typography.Body variant="small" appearance="neutral">
                Ректор: {universityData.university.rector}
              </Typography.Body>
            </Flex>
          </Flex>

          {/* Навигация */}
          <Flex gap={8}>
            <Button
              size="small"
              mode={activeTab === "overview" ? "primary" : "secondary"}
              onClick={() => setActiveTab("overview")}
            >
              Обзор
            </Button>
            <Button
              size="small"
              mode={activeTab === "students" ? "primary" : "secondary"}
              onClick={() => setActiveTab("students")}
            >
              Студенты
            </Button>
            <Button
              size="small"
              mode={activeTab === "partners" ? "primary" : "secondary"}
              onClick={() => setActiveTab("partners")}
            >
              Партнеры
            </Button>
          </Flex>

          {/* Контент */}
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "partners" && <PartnersTab />}
        </Flex>
      </Container>
    </Panel>
  );
}