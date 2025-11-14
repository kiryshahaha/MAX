# MAX University of Aerospace Instrumentation - Полная система

Комплексное решение студенческого портала ГУАП с парсингом данных из личного кабинета и веб-приложением для отображения информации.

## Основные возможности

- Парсинг и синхронизация данных из ЛК ГУАП
- Аутентификация студентов через учетные данные портала
- REST API для фронтенд приложений
- Хранение данных в Supabase
- Полный функционал для студентов: расписание, задачи, оценки, отчеты, дедлайны
- Интеграция профиля студента

## Структура проекта

```
MAX/
├── parser/                    # Парсер данных с ГУАП ЛК
│   ├── auth/                  # Модуль аутентификации
│   ├── core/                  # Основной функционал парсинга
│   ├── node_modules/          # Зависимости
│   ├── scrapers/              # Скреперы для различных разделов ЛК
│   ├── utils/                 # Утилиты и вспомогательные функции
│   ├── .gitignore
│   ├── Dockerfile             # Docker конфигурация
│   ├── index.js               # Точка входа приложения
│   ├── package-lock.json
│   ├── package.json           # Зависимости и скрипты
│   └── server.js              # Express сервер
│
├── backend/                   # Backend API
│   ├── app/
│   │   ├── main.py           # FastAPI приложение
│   │   ├── db/
│   │   │   ├── supabase_client.py
│   │   │   ├── dependencies.py
│   │   │   └── models.py
│   │   ├── routes/
│   │   │   ├── tasks.py
│   │   │   ├── schedule.py
│   │   │   ├── profile.py
│   │   │   ├── marks.py
│   │   │   ├── reports.py
│   │   │   ├── users.py
│   │   │   ├── faculties.py
│   │   │   ├── teachers.py
│   │   │   └── rooms.py
│   │   ├── requirements.txt
│   │   └── README.md
│   ├── psychologist_service/  # Микросервис для бронирования к психологам
│   │   ├── auth/              # Модуль аутентификации
│   │   ├── core/              # Основной функционал
│   │   ├── scrapers/          # Скреперы данных
│   │   ├── utils/             # Утилиты
│   │   ├── requirements.txt   # Зависимости Python
│   │   ├── .env               # Переменные окружения сервиса
│   │   ├── .gitignore
│   │   ├── Dockerfile         # Docker конфигурация
│   │   ├── main.py            # Точка входа FastAPI
│   │   ├── repository.py      # Работа с БД
│   │   ├── schemas.py         # Pydantic модели
│   │   └── service.py         # Бизнес-логика
│   ├── .env                   # Переменные окружения backend
│   └── docker-compose.yml     # Docker Compose для оркестрации
│
└── miniapp/                   # Фронтенд приложение (Next.js + React)
    ├── .next/                 # Build директория
    ├── lib/                   # Библиотеки и утилиты
    ├── node_modules/          # Зависимости
    ├── public/                # Статические файлы
    ├── src/
    │   ├── app/               # App Router (Next.js 13+)
    │   │   ├── api/           # API routes
    │   │   ├── auth/          # Страницы аутентификации
    │   │   ├── main/          # Главная страница
    │   │   ├── profile/       # Профиль пользователя
    │   │   ├── PsychologistBooking/  # Бронирование у психолога
    │   │   ├── schedule/      # Расписание
    |   |   ├── UniversityDashboard/ # Дашборд
    │   ├── components/        # React компоненты
    │   │   ├── BottomNavBar.jsx        # Нижняя панель навигации
    │   │   ├── DeadlinesSection.jsx    # Секция дедлайнов
    │   │   ├── NotificationsSection.jsx # Секция уведомлений
    │   │   ├── ReportsSection.jsx      # Секция отчетов
    │   │   └── ScheduleSection.jsx     # Секция расписания
    │   ├── constants/         # Константы приложения
    │   ├── services/          # Сервисы и API клиенты
    │   ├── utils/             # Утилиты и вспомогательные функции
    │   ├── globals.css        # Глобальные стили
    │   ├── layout.js          # Корневой layout
    │   ├── page.jsx           # Главная страница
    │   └── page.module.css    # Стили главной страницы
    ├── .env                   # Переменные окружения
    ├── .gitignore             # Git игнор
    ├── Dockerfile             # Docker конфигурация
    ├── eslint.config.mjs      # ESLint конфигурация
    ├── jsconfig.json          # JavaScript конфигурация
    ├── next.config.mjs        # Next.js конфигурация
    ├── package.json           # Зависимости и скрипты
    ├── package-lock.json      # Lock файл
    └── README.md              # Документация miniapp
```

## Структура miniapp (Next.js + React)

### Основные директории

#### `/src/app` - Pages & Routing (Next.js App Router)

Это основная структура приложения с использованием файловой маршрутизации Next.js 13+:

- **`auth/`** - Страницы аутентификации (вход/регистрация)
- **`main/`** - Главная страница дашборда
- **`schedule/`** - Расписание студента
- **`profile/`** - Профиль и персональная информация
- **`PsychologistBooking/`** - Система бронирования у психолога
- **`UniversityDashboard/`** - Дашборд с комплексным представлением ключевых показателей университета

#### `/src/components` - React компоненты

Переиспользуемые UI компоненты:

- **`BottomNavBar.jsx`** - Нижняя панель навигации для мобильных устройств
- **`DeadlinesSection.jsx`** - Компонент для отображения дедлайнов
- **`NotificationsSection.jsx`** - Компонент уведомлений
- **`ReportsSection.jsx`** - Компонент отчетов
- **`ScheduleSection.jsx`** - Компонент расписания

#### `/src/services` - API клиенты

Сервисы для взаимодействия с parser API:

- Получение задач
- Получение расписания
- Получение оценок
- Получение отчетов
- Получение информации профиля
- Аутентификация

#### `/src/utils` - Утилиты

Вспомогательные функции:

- Форматирование дат
- Обработка ошибок
- Валидация данных
- Работа с хранилищем

#### `/src/constants` - Константы

- Текстовые константы
- Конфигурационные значения

### Стили

- **`globals.css`** - Глобальные стили для всего приложения
- **`page.module.css`** - Модульные стили для главной страницы
- **`layout.js`** - Root layout со стилями

### Конфигурационные файлы

- **`next.config.mjs`** - Конфигурация Next.js
- **`jsconfig.json`** - Конфигурация путей и JS параметров
- **`eslint.config.mjs`** - Правила ESLint
- **.env** - Переменные окружения (API URL, токены и т.д.)



## Установка и запуск

### Предварительные требования

- Node.js (версия 14+)
- Python 3.8+
- npm или yarn
- Доступ к Supabase

### 1️⃣ Запуск парсера

Парсер извлекает актуальные данные из ЛК ГУАП и синхронизирует их с базой данных.

```bash
cd parser
npm install
npm run dev
```

**Что делает парсер:**
- Подключается к ЛК ГУАП при вводе логина и пароля
- Извлекает данные студентов
- Парсит расписание, задачи, оценки, отчеты, профиль
- Загружает данные в Supabase
- Периодически синхронизирует изменения

### 2️⃣ Запуск backend API

Backend предоставляет REST API для фронтенда и управления данными.

```bash
cd backend/app
python -m venv myenv

# Linux/Mac
source myenv/bin/activate

# Windows
myenv\Scripts\activate

pip install -r requirements.txt
```

**Настройка переменных окружения** (файл `backend/.env`):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Запуск сервера:**

```bash
uvicorn main:app --reload --port 8000
```

Backend будет доступен по адресу: `http://localhost:8000`

Документация API:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 3️⃣ Запуск Psychologist Service 

Микросервис для управления записями к психологам работает как отдельный сервис.

```bash
cd backend/psychologist_service
python -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

**Запуск сервиса:**

```bash
uvicorn main:app --reload --port 8001
```

Сервис будет доступен по адресу: `http://localhost:8001`

Документация API сервиса:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

### 4️⃣ Запуск miniapp (Next.js фронтенд)

```bash
cd miniapp
npm install
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

**Переменные окружения** (файл `miniapp/.env`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_role_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PARSER_SERVICE_URL=parser_url
FASTAPI_URL=backend_url
PSYCHOLOGIST_API_URL=psychologist_service_url
```

## Функционал miniapp

### Экран входа (`/auth`)

- Форма аутентификации с логином и паролем
- Валидация учетных данных
- Сообщения об ошибках

### Главный экран (`/main`)

После входа студент видит интеграцию всех основных функций:
- Расписание на сегодня с прогрессом пары в реальном времени
- Ближайшие дедлайны, с учетом сданных задач
- Отчёты: в приоритете со статусом "ожидает проверки", "отклонён", а также ближайшие со статусом "принят"
- Блок записи к психологу
- Уведомления

#### Расписание на неделю (`/schedule/week`)

- Полное расписание на неделю, сегодня, завтра и вчера
- Информация: тип занятия (Л/ПР/ЛР), предмет, время, аудитория, корпус

#### Текущие задачи

- Список всех активных задач через
- Дедлайны для каждой задачи
- Статус задачи (принята, на проверке, отклонена)
- Максимальный балл и набранные баллы
- Тип задачи (лабораторная работа, курсовая, тест и т.д.)

#### Загруженные отчеты

- Список всех отправленных отчетов с приоритетами
- Дата загрузки
- Статус проверки (принят, на проверке, вернул)

#### Профиль студента (`/profile`)

- ФИО студента
- Номер зачетной книжки
- Номер группы
- Форма обучения (очная/заочная)
- Факультет

#### Бронирование у психолога (`/PsychologistBooking`)

- Система записи на консультацию
- Выбор психолога и времени
- Просмотр своих записей

**Доступные психологи и расписание:**

**Клепов Дмитрий Олегович**
- Вторник: 16:00 - 20:00
- Четверг: 16:00 - 20:00
- Суббота: 11:00 - 16:00

**Кашкина Лариса Владимировна**
- Понедельник: 10:00 - 14:00
- Среда: 10:00 - 14:00
- Пятница: 10:00 - 14:00

Запись доступна только на целые часы (09:00, 10:00, 14:00 и т.д.)

#### Аналитический дашборд (`/PsychologistBooking`)

Дашборд превращает разрозненные данные в осмысленную информацию, позволяя университету эффективно управлять образовательным процессом и стратегически развиваться.

**Академическая эффективность**

- Мониторинг успеваемости по институтам
- Выявление проблемных зон (академические задолженности)
- Анализ распределения студентов по курсам и формам обучения

**Международная активность**

- Статистика иностранных студентов по регионам
- Доля международных студентов от общего контингента
- Географическое распределение (СНГ, Азия, другие)

**Кадровый и инфраструктурный потенциал**

- Квалификация преподавательского состава
- Распределение по образовательным программам
- Инфраструктура (корпуса, общежития)

### Нижняя панель навигации

Компонент `BottomNavBar.jsx` отображает быструю навигацию:
- Главная
- Расписание
- Дашборд
- Профиль

## API эндпоинты miniapp

### Аутентификация

```
POST /auth/login
Body: { username, password }
Response: { token, user_id, uid }
```

### Данные студента

```
GET /profile?uid={user_id}
GET /tasks?uid={user_id}
GET /schedule?uid={user_id}
GET /schedule/today?uid={user_id}
GET /schedule/tomorrow?uid={user_id}
GET /schedule/week?uid={user_id}
GET /marks?uid={user_id}
GET /reports?uid={user_id}
```

## Примеры ответов API

### Профиль

```json
{
  "success": true,
  "profile": {
    "personal_info": {
      "full_name": "Иванов Иван Иванович",
      "student_id": "2024/4034"
    },
    "academic_info": {
      "group": "4433",
      "education_form": "очная"
    }
  }
}
```

### Расписание на неделю

```json
{
  "success": true,
  "uid": "user_id",
  "today": {
    "date": "2025-11-14",
    "date_dd_mm": "14.11",
    "day_name": "Пт",
    "schedule": [
      {
        "type": "Л",
        "subject": "Теория вероятностей",
        "timeRange": "09:30 - 11:00",
        "location": "32-01"
      },
      {
        "type": "ПР",
        "subject": "Дискретная математика",
        "timeRange": "11:10 - 12:40",
        "location": "15-02"
      }
    ]
  },
  "tomorrow": {
    "date": "2025-11-15",
    "date_dd_mm": "15.11",
    "day_name": "Сб",
    "schedule": []
  }
}
```

### Задачи

```json
{
  "success": true,
  "tasks": [
    {
      "task": {
        "id": 168453,
        "name": "ЛАБОРАТОРНАЯ РАБОТА №1",
        "type": "Лабораторная работа",
        "deadline": "15.11.2025 23:59:59"
      },
      "score": {
        "max": 10,
        "achieved": 7
      },
      "status": {
        "code": "accepted",
        "text": "принят"
      }
    },
    {
      "task": {
        "id": 168454,
        "name": "КУРСОВАЯ РАБОТА",
        "type": "Курсовая работа",
        "deadline": "01.12.2025 23:59:59"
      },
      "score": {
        "max": 40,
        "achieved": 0
      },
      "status": {
        "code": "pending",
        "text": "ожидается"
      }
    }
  ],
  "tasks_count": 32,
  "uid": "user_id"
}
```

### Оценки

```json
{
  "success": true,
  "marks": [
    {
      "subject": {
        "name": "Алгоритмы и структуры данных"
      },
      "control": {
        "typeText": "Экзамен",
        "status": "pending"
      },
      "credits": {
        "value": 4
      },
      "mark": null
    },
    {
      "subject": {
        "name": "Теория вероятностей"
      },
      "control": {
        "typeText": "Зачет",
        "status": "completed"
      },
      "credits": {
        "value": 3
      },
      "mark": "зачет"
    }
  ]
}
```

### Отчеты

```json
{
  "success": true,
  "reports": [
    {
      "task": {
        "id": 168453,
        "name": "ЛАБОРАТОРНАЯ РАБОТА №1"
      },
      "status": {
        "text": "принят",
        "code": "accepted"
      },
      "load_date": {
        "text": "06.11.2025 17:10:16"
      },
      "check_date": {
        "text": "07.11.2025 09:30:00"
      }
    }
  ]
}
```

## Модель данных Supabase

### Таблица `users`

Аутентификация и основная информация пользователей

### Таблица `user_data`

Расширенные данные каждого студента в формате JSONB:

```json
{
  "profile": {
    "full_name": "string",
    "student_id": "string",
    "group": "string",
    "education_form": "string"
  },
  "tasks": [
    {
      "id": "number",
      "name": "string",
      "type": "string",
      "deadline": "string",
      "score": { "max": "number", "achieved": "number" },
      "status": { "code": "string", "text": "string" }
    }
  ],
  "week_schedule": [
    {
      "date": "string",
      "day_name": "string",
      "schedule": [
        {
          "type": "string",
          "subject": "string",
          "timeRange": "string",
          "location": "string"
        }
      ]
    }
  ],
  "marks": [
    {
      "subject": { "name": "string" },
      "control": { "typeText": "string", "status": "string" },
      "credits": { "value": "number" }
    }
  ],
  "reports": [
    {
      "task": { "id": "number", "name": "string" },
      "status": { "text": "string", "code": "string" },
      "load_date": { "text": "string" }
    }
  ]
}
```

## Технологический стек

### Parser

- Node.js - среда выполнения JavaScript
- Puppeteer - веб-скрепинг
- Supabase Client - работа с БД

### Backend

- FastAPI - Python фреймворк для REST API
- Pydantic - валидация данных
- Uvicorn - ASGI сервер
- Supabase Python Client - работа с БД

### Frontend (miniapp)

- Next.js 13+ - React фреймворк с SSR и оптимизацией
- React 18+ - библиотека для UI
- Fetch - HTTP клиент для API запросов
- CSS Modules - модульная стилизация
- ESLint - проверка кода

### Инфраструктура

- Supabase - PostgreSQL + Authentication
- Docker - контейнеризация
- Nginx - reverse proxy
- GitHub / GitLab - версионирование

## Psychologist Service - Микросервис бронирования

Отдельный микросервис для управления записями к психологам с полным функционалом проверки расписания и занятости.

### Основной функционал

#### 1. Создание записи к психологу

- Пользователь выбирает психолога и время записи
- Система проверяет:
  - Психолог работает в выбранный день
  - Время кратно целому часу (09:00, 14:00 и т.д.)
  - Время еще свободно
- Если все верно, запись сохраняется в базе Supabase

#### 2. Просмотр своих записей

- Пользователь получает список всех своих записей
- API возвращает: дату, время, имя психолога, заметки

#### 3. Просмотр занятости психолога

- Психолог видит свое расписание
- Информация о загруженных часах
- Свободные слоты для новых записей

#### 4. Получение доступных слотов

- API возвращает свободные часовые слоты на выбранный день
- Удобно для выбора времени на фронтенде

### Доступные психологи и расписание

Для записи доступны 2 психолога с фиксированным расписанием:

**Клепов Дмитрий Олегович**
- Вторник: 16:00 - 20:00
- Четверг: 16:00 - 20:00
- Суббота: 11:00 - 16:00

**Кашкина Лариса Владимировна**
- Понедельник: 10:00 - 14:00
- Среда: 10:00 - 14:00
- Пятница: 10:00 - 14:00

Запись доступна только на целые часы.

### API эндпоинты Psychologist Service

```
POST /appointments/create
Body: { user_id, psychologist_id, date, time }
Response: { success, appointment_id, message }

GET /appointments/my?user_id={user_id}
Response: { success, appointments: [...] }

GET /psychologists/{id}/schedule
Response: { success, schedule: {...}, busy_slots: [...] }

GET /psychologists/{id}/available-slots?date={date}
Response: { success, available_slots: [...] }

DELETE /appointments/{id}
Response: { success, message }
```

### Пример ответов

**Создание записи:**
```json
{
  "success": true,
  "appointment_id": "apt_12345",
  "message": "Запись успешно создана",
  "appointment": {
    "date": "2025-11-18",
    "time": "16:00",
    "psychologist": "Клепов Дмитрий Олегович",
    "user_id": "user_123"
  }
}
```

**Список своих записей:**
```json
{
  "success": true,
  "appointments": [
    {
      "id": "apt_12345",
      "date": "2025-11-18",
      "time": "16:00",
      "psychologist": "Клепов Дмитрий Олегович",
      "status": "confirmed"
    }
  ]
}
```

**Доступные слоты:**
```json
{
  "success": true,
  "date": "2025-11-18",
  "psychologist": "Клепов Дмитрий Олегович",
  "available_slots": ["16:00", "17:00", "18:00"]
}
```

## Правильный порядок запуска

### Первый запуск 

**Терминал 1: Парсер**
```bash
cd parser
npm install
npm run dev
```
Ждем инициализации парсера (должны появиться логи о подключении)

**Терминал 2: Backend** (открыть в новом терминале)
```bash
cd backend/app
python -m venv myenv
source myenv/bin/activate  # или для Windows: myenv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Ждем запуска API сервера (должно появиться сообщение о запуске на порту 8000)

**Терминал 3: Miniapp Frontend** (открыть в новом терминале)
```bash
cd miniapp
npm install
npm run dev
```
Ждем запуска фронтенда (должно появиться сообщение о запуске на порту 3000)

### Последующие запуски

```bash
# Терминал 1: Парсер
cd parser && npm run dev

# Терминал 2: Backend
cd backend/app && source myenv/bin/activate && uvicorn main:app --reload --port 8000

# Терминал 3: Frontend
cd miniapp && npm run dev
```

## Использование приложения

1. Открыть `http://localhost:3000` в браузере
2. Будет перенаправление на страницу входа `/auth`
3. Ввести логин и пароль от ЛК ГУАП
4. Нажать "Войти"
5. После успешной аутентификации попадешь на главную страницу `/main`
6. Использовать нижнюю панель навигации для переключения между разделами:
   - Главная (дашборд)
   - Профиль
   - Войти
7. Просматривать можно:
   - Расписание на неделю
   - Текущие задачи с дедлайнами
   - Загруженные отчеты
   - Оценки
   - Информацию профиля

## Безопасность

- Пароли не сохраняются, используются только для аутентификации
- Все данные передаются по HTTPS (в продакшене)
- CORS правила для API
- SQL инжекции предотвращены через ORM/Pydantic
- Защита от XSS через React

## Мониторинг и улучшения

- Кэширование часто запрашиваемых данных
- Rate limiting для API
- WebSocket для real-time обновлений
