import express from 'express';
import cors from 'cors';
import { scrapeGuapTasks, scrapeGuapReports, scrapeGuapProfile, scrapeGuapSchedule, scrapeGuapMarks } from './index.js';
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

app.post('/api/logout', async (req, res) => {
  try {
    const { username } = req.body;
    const userId = username; // или другой идентификатор
    
    const session = SessionManager.sessions.get(userId);
    if (session) {
      await session.page.close();
      SessionManager.sessions.delete(userId);
    }
    
    res.json({ success: true, message: '✅ Сессия завершена' });
  } catch (error) {
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

// Универсальный эндпоинт для парсинга
app.post('/api/scrape', async (req, res) => {
  try {
    const { username, password, type = 'tasks' } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '❌ Укажите логин и пароль'
      });
    }

    console.log(`Запрос на парсинг для пользователя: ${username}, тип: ${type}`);
    
    let result;
    if (type === 'reports') {
      result = await scrapeGuapReports({ username, password });
    } else {
      result = await scrapeGuapTasks({ username, password });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Ошибка в API парсера:', error);
    res.status(500).json({
      success: false,
      message: `❌ Ошибка парсера: ${error.message}`
    });
  }
});

// Отдельные эндпоинты для обратной совместимости
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

// Новый эндпоинт для расписания
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