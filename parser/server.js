// server.js
import express from 'express';
import cors from 'cors';
import { 
  scrapeGuapTasks, 
  scrapeGuapReports, 
  scrapeGuapProfile, 
  scrapeGuapSchedule, 
  scrapeGuapDailySchedule,
  scrapeGuapMarks 
} from './index.js';
import { SessionManager } from './core/session-manager.js';

setInterval(() => {
  SessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000); // Каждые 5 минут

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT. Cleaning up sessions...');
  await SessionManager.cleanupAllSessions();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM. Cleaning up sessions...');
  await SessionManager.cleanupAllSessions();
  process.exit(0);
});

app.post('/api/scrape/logout', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (username) {
      const session = SessionManager.sessions.get(username);
      if (session) {
        try {
          await session.page.close();
          await session.browser.close();
        } catch (e) {
          console.log('Ошибка при закрытии браузера:', e.message);
        }
        SessionManager.sessions.delete(username);
        console.log(`✅ Сессия парсера закрыта для: ${username}`);
      }
    }
    
    res.json({ success: true, message: '✅ Сессии завершены' });
  } catch (error) {
    console.error('Ошибка при выходе из парсера:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/sessions', (req, res) => {
  const sessionsInfo = Array.from(SessionManager.sessions.entries()).map(([userId, session]) => ({
    userId,
    createdAt: new Date(session.createdAt).toISOString(),
    lastActivity: new Date(session.lastActivity).toISOString(),
    age: Date.now() - session.createdAt
  }));
  
  res.json({
    activeSessions: SessionManager.sessions.size,
    sessions: sessionsInfo
  });
});

app.get('/api/sessions/stats', (req, res) => {
  const stats = SessionManager.getSessionStats();
  res.json({
    success: true,
    stats,
    sessions: Array.from(SessionManager.sessions.entries()).map(([username, session]) => ({
      username,
      createdAt: new Date(session.createdAt).toISOString(),
      lastActivity: new Date(session.lastActivity).toISOString(),
      age: Date.now() - session.createdAt,
      isValid: SessionManager.isSessionValid(session)
    }))
  });
});

app.post('/api/scrape/init-session', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`🔐 Инициализация сессии для пользователя: ${username}`);
    
    // Сначала проверяем существующую сессию
    const sessionActive = await SessionManager.isSessionActive(username);
    
    if (sessionActive) {
      return res.json({
        success: true,
        message: '✅ Используется существующая сессия',
        sessionActive: true,
        sessionId: username
      });
    }

    // Если сессии нет или она невалидна - создаем новую
    const result = await SessionManager.createSession(username, password);
    
    if (result.success) {
      res.json({
        success: true,
        message: '✅ Сессия парсера инициализирована',
        sessionActive: true,
        sessionId: username
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || '❌ Ошибка авторизации в ЛК ГУАП'
      });
    }

  } catch (error) {
    console.error('Ошибка инициализации сессии:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка инициализации сессии: ${error.message}`
    });
  }
});

// Эндпоинт для проверки существующей сессии
app.post('/api/scrape/check-session', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин'
      });
    }

    console.log(`🔍 Проверка сессии для пользователя: ${username}`);
    
    const sessionActive = await SessionManager.isSessionActive(username);
    
    if (sessionActive) {
      return res.json({
        success: true,
        message: '✅ Активная сессия найдена',
        sessionActive: true
      });
    } else {
      return res.json({
        success: true,
        message: '❌ Сессия не найдена или устарела',
        sessionActive: false
      });
    }

  } catch (error) {
    console.error('Ошибка проверки сессии:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка проверки сессии: ${error.message}`
    });
  }
});

// Эндпоинт для расписания на день
app.post('/api/scrape/daily-schedule', async (req, res) => {
  try {
    const { username, password, date } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите дату в формате YYYY-MM-DD'
      });
    }

    console.log(`Запрос на парсинг расписания за ${date} для пользователя: ${username}`);
    const result = await scrapeGuapDailySchedule({ username, password }, date);
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера расписания на день:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера расписания: ${error.message}`
    });
  }
});

// Эндпоинт для расписания на неделю
app.post('/api/scrape/schedule', async (req, res) => {
  try {
    const { username, password, year = 2025, week = 44 } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`Запрос на парсинг расписания для пользователя: ${username}, год: ${year}, неделя: ${week}`);
    const result = await scrapeGuapSchedule({ username, password }, year, week);
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера расписания:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера расписания: ${error.message}`
    });
  }
});

// Остальные эндпоинты остаются без изменений...
app.post('/api/scrape/tasks', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`Запрос задач для пользователя: ${username}`);
    const result = await scrapeGuapTasks({ username, password });
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера задач:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера задач: ${error.message}`
    });
  }
});

app.post('/api/scrape/reports', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`Запрос на парсинг отчетов для пользователя: ${username}`);
    const result = await scrapeGuapReports({ username, password });
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера отчетов:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера отчетов: ${error.message}`
    });
  }
});

app.post('/api/scrape/profile', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`Запрос на парсинг профиля для пользователя: ${username}`);
    const result = await scrapeGuapProfile({ username, password });
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера профиля:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера профиля: ${error.message}`
    });
  }
});

app.post('/api/scrape/marks', async (req, res) => {
  try {
    const { username, password, semester = null, contrType = 0, teacher = 0, mark = 0 } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`Запрос на парсинг оценок для пользователя: ${username}, семестр: ${semester}`);
    const result = await scrapeGuapMarks({ username, password }, semester, contrType, teacher, mark);
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера оценок:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера оценок: ${error.message}`
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'GUAP Parser' });
});

app.listen(PORT, () => {
  console.log(`🚀 Parser service running on port ${PORT}`);
});