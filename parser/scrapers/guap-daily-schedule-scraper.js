// parser/scrapers/guap-daily-schedule-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';
import { SessionManager } from '../core/session-manager.js'; 

export class GuapDailyScheduleScraper extends BaseScraper {
  constructor() {
    super();
  }

   async scrapeDailySchedule(credentials, date) {
    console.log('🎯 НАЧАЛО ПАРСИНГА РАСПИСАНИЯ НА ДЕНЬ');
    console.log('📅 Дата:', date);
    console.log('👤 Пользователь:', credentials.username);
    
    let page;
    
    try {
      await this.validateCredentials(credentials);
      
      // ДЕБАГ СЕССИИ ПЕРЕД ПОЛУЧЕНИЕМ СТРАНИЦЫ
      const userId = this.getUserId(credentials);
      console.log('🔍 Проверка сессии для пользователя:', userId);
      await SessionManager.debugSession(userId);
      
      page = await this.getAuthenticatedPage(credentials);
      console.log('✅ Аутентифицированная страница получена');

      // Переход к расписанию на день
      console.log('🧭 ПЕРЕХОД К РАСПИСАНИЮ...');
      await this.navigateToDailySchedule(page, date);
      
      // Парсинг расписания
      console.log('📊 ПАРСИНГ РАСПИСАНИЯ...');
      const scheduleData = await this.parseDailySchedule(page);
      
      console.log('✅ ПАРСИНГ ЗАВЕРШЕН:', {
        success: true,
        scheduleCount: scheduleData.length,
        date: date
      });
      
      return {
        success: true,
        message: `✅ Расписание на ${date} загружено`,
        schedule: scheduleData,
        date: date,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('💥 ОШИБКА ПАРСИНГА:', error);
      
      if (page) {
        console.log('🔄 Инвалидация сессии из-за ошибки...');
        await this.invalidateSession(credentials);
      }
      
      throw error;
    }
  }

async navigateToDailySchedule(page, date) {
    console.log(`🧭 ПЕРЕХОД К РАСПИСАНИЮ ЗА ${date}...`);
    
    const scheduleUrl = `https://pro.guap.ru/inside/students/classes/schedule/day/${date}`;
    console.log('   - URL:', scheduleUrl);
    
    try {
      await page.goto(scheduleUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      console.log('✅ Страница расписания загружена. URL:', page.url());

      // Более надежная проверка загрузки с логированием
      console.log('⏳ Ожидание элементов расписания...');
      await page.waitForFunction(() => {
        const table = document.querySelector('table.table-bordered');
        const noSchedule = document.querySelector('.alert.alert-info');
        const loading = document.querySelector('[class*="loading"], [class*="spinner"]');
        
        console.log('   - Элементы на странице:', {
          table: !!table,
          noSchedule: !!noSchedule,
          loading: !!loading
        });
        
        return table !== null || noSchedule !== null || !loading;
      }, { timeout: 15000, polling: 500 });
      
      console.log('✅ Элементы расписания загружены');
      
    } catch (error) {
      console.error('❌ Ошибка загрузки страницы расписания:', error);
      
      // Проверяем что вообще на странице
      const pageContent = await page.content();
      console.log('🔍 Содержимое страницы (первые 500 символов):', pageContent.slice(0, 500));
      
      throw error;
    }
  }

  async parseDailySchedule(page) {
    return await page.evaluate(() => {
      
      const classes = [];
      
      // Проверяем, есть ли сообщение "нет занятий"
      const noScheduleAlert = document.querySelector('.alert.alert-info');
      if (noScheduleAlert) {
        console.log('ℹ️ Найдено сообщение о отсутствии занятий');
        return classes;
      }

      const table = document.querySelector('table.table-bordered');
      
      if (!table) {
        console.log('❌ Таблица расписания не найдена');
        return classes;
      }

      const rows = table.querySelectorAll('tbody tr');
      console.log(`📊 Найдено строк в таблице: ${rows.length}`);
      
      // Если строк нет, проверяем наличие занятий другим способом
      if (rows.length === 0) {
        const anyContent = table.textContent.trim();
        if (anyContent.includes('нет занятий') || anyContent.includes('занятий не найдено')) {
          console.log('ℹ️ В таблице указано, что занятий нет');
          return classes;
        }
      }
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 3) {
          const pairNumber = cells[0]?.textContent?.trim();
          const timeRange = cells[1]?.textContent?.trim();
          const classCell = cells[2];
          
          // Проверяем, что ячейка действительно содержит занятие (не пустая и не содержит сообщение о отсутствии)
          const cellText = classCell.textContent.trim();
          if (cellText !== '' && 
              !cellText.includes('нет занятий') && 
              !cellText.includes('занятий не найдено')) {
            
            // Парсим информацию о занятии
            const badge = classCell.querySelector('.badge');
            const subjectElement = classCell.querySelector('.fw-bolder');
            const teacherElement = classCell.querySelector('[class*="teacher"], .short-teacher');
            const groupBadge = classCell.querySelector('.badge.bg-dark');
            const locationElement = classCell.querySelector('.bi-geo-alt');
            
            // Извлекаем информацию о преподавателе
            let teacher = '';
            let teacherInfo = '';
            if (teacherElement) {
              // Берем основной текст (имя преподавателя)
              teacher = teacherElement.childNodes[0]?.textContent?.trim() || '';
              
              // Извлекаем должность из span
              const teacherSpan = teacherElement.querySelector('span');
              if (teacherSpan) {
                teacherInfo = teacherSpan.textContent.trim();
                teacherInfo = teacherInfo.replace(/[()]/g, '').trim();
              }
            }
            
            // Извлекаем информацию о местоположении
            let building = '';
            let location = '';
            if (locationElement) {
              // Получаем следующий текстовый узел после иконки
              let locationText = '';
              let nextNode = locationElement.nextSibling;
              
              while (nextNode && nextNode.nodeType === 3) { // TEXT_NODE
                locationText += nextNode.textContent;
                nextNode = nextNode.nextSibling;
              }
              
              locationText = locationText.trim();
              
              if (locationText) {
                const parts = locationText.split(',');
                if (parts.length >= 2) {
                  building = parts[0].trim();
                  location = parts[1].trim().replace('*', '');
                } else {
                  building = locationText.replace('*', '').trim();
                }
              }
            }

            const classData = {
              pairNumber: pairNumber || '',
              timeRange: timeRange || '',
              type: badge?.textContent?.trim() || '',
              subject: subjectElement?.textContent?.trim() || '',
              teacher: teacher,
              teacherInfo: teacherInfo,
              group: groupBadge?.textContent?.trim() || '',
              building: building,
              location: location
            };
            
            console.log(`📚 Занятие ${index + 1}:`, {
              пара: classData.pairNumber,
              предмет: classData.subject,
              тип: classData.type,
              преподаватель: classData.teacher
            });
            
            classes.push(classData);
          } else {
            console.log(`⏸️ Пропущена пустая строка ${index + 1}`);
          }
        }
      });
      
      console.log(`✅ Всего занятий за день: ${classes.length}`);
      return classes;
    });
  }
}