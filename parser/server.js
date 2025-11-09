import express from 'express';
import cors from 'cors';
import { scrapeGuapTasks, scrapeGuapReports, scrapeGuapProfile, scrapeGuapSchedule } from './index.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Универсальный эндпоинт для парсинга
app.post('/api/scrape', async (req, res) => {
  try {
    const { username, password, type = 'tasks', year, week } = req.body;

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
    } else if (type === 'schedule') {
      result = await scrapeGuapSchedule({ username, password }, year, week);
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

// Существующие эндпоинты остаются...

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

// Остальные существующие эндпоинты...
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'GUAP Parser' });
});

app.listen(PORT, () => {
  console.log(`🚀 Parser service running on port ${PORT}`);
});