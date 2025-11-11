// parser/scrapers/guap-schedule-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapScheduleScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

  async scrapeSchedule(credentials, year = 2025, week = 44) {
    let page;
    
    try {
      await this.validateCredentials(credentials);
      page = await this.getAuthenticatedPage(credentials);

      // Переход к расписанию
      await this.navigateToSchedule(page, year, week);
      
      // Парсинг расписания
      const scheduleData = await this.parseSchedule(page);
      
      return {
        success: true,
        message: `✅ Расписание на неделю ${week} загружено`,
        schedule: scheduleData,
        year: year,
        week: week,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      if (page) {
        await this.invalidateSession(credentials);
      }
      throw error;
    }
  }

  async navigateToSchedule(page, year, week) {
    console.log(`Переходим на страницу расписания (год: ${year}, неделя: ${week})...`);
    
    const scheduleUrl = `https://pro.guap.ru/inside/students/classes/schedule/week/${year}/${week}`;
    
    await page.goto(scheduleUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    await page.waitForFunction(() => {
      const tables = document.querySelectorAll('table.table-bordered');
      return tables.length > 0;
    }, { timeout: 10000 });
  }

  async parseSchedule(page) {
    return await page.evaluate(() => {
      
      // Функция для парсинга местоположения
      const parseBuildingAndRoom = (locationText) => {
        if (!locationText) return { building: '', location: '' };
        
        const parts = locationText.split(',');
        if (parts.length >= 2) {
          return {
            building: parts[0].trim(),
            location: parts[1].trim()
          };
        }
        return {
          building: locationText.trim(),
          location: ""
        };
      };

      // Функция для парсинга ячейки с информацией о занятии
      const parseClassCell = (cell) => {
      try {
        // Извлекаем тип занятия (бейдж)
        const badge = cell.querySelector('.badge.bg-primary');
        const type = badge ? badge.textContent.trim() : '';

        // Извлекаем название предмета
        const subjectElement = cell.querySelector('.fw-bolder');
        const subject = subjectElement ? subjectElement.textContent.trim() : '';

        // Извлекаем информацию о преподавателе
        const teacherElement = cell.querySelector('[class*="teacher"], .short-teacher');
        let teacher = '';
        let teacherInfo = '';
        
        if (teacherElement) {
          // Берем текст до span (имя преподавателя)
          const teacherText = teacherElement.childNodes[0]?.textContent?.trim() || '';
          teacher = teacherText.replace('Жучкова М.Г.', 'Жучкова М.Г.').trim(); // Пример корректного имени
          
          // Извлекаем информацию о должности из span
          const teacherSpan = teacherElement.querySelector('span');
          if (teacherSpan) {
            teacherInfo = teacherSpan.textContent.trim();
            // Убираем скобки если есть
            teacherInfo = teacherInfo.replace(/[()]/g, '').trim();
          }
        }

        // Извлекаем информацию о группе
        const groupBadge = cell.querySelector('.badge.bg-dark');
        const group = groupBadge ? groupBadge.textContent.trim() : '';

        // Извлекаем информацию о местоположении - ИСПРАВЛЕННЫЙ КОД
        const locationElement = cell.querySelector('.bi-geo-alt');
        let building = '';
        let location = '';
        
        if (locationElement && locationElement.parentElement) {
          // Берем только текст после иконки локации
          const locationText = locationElement.nextSibling?.textContent?.trim() || '';
          
          if (locationText) {
            const parts = locationText.split(',');
            if (parts.length >= 2) {
              building = parts[0].trim();
              location = parts[1].trim();
            } else {
              // Если нет запятой, пробуем разделить по последнему пробелу
              const words = locationText.split(' ');
              if (words.length > 1) {
                const lastWord = words[words.length - 1];
                // Проверяем, похоже ли на номер аудитории
                if (lastWord.match(/[\d-]/)) {
                  building = words.slice(0, -1).join(' ').trim();
                  location = lastWord;
                } else {
                  building = locationText;
                }
              } else {
                building = locationText;
              }
            }
          }
        }

        return {
          type: type,
          subject: subject,
          teacher: teacher,
          teacherInfo: teacherInfo,
          group: group,
          building: building,
          location: location
        };
      } catch (error) {
        console.error('Ошибка парсинга ячейки:', error);
        return null;
      }
    };

      // Порядок дней недели для сортировки
      const dayOrder = {
        'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6, 'Вс': 7
      };

      const schedule = {
        days: [],
        extraClasses: []
      };

      // Парсинг основного расписания (первая таблица)
      const mainTable = document.querySelector('table.table-bordered');
      if (mainTable) {
        const rows = mainTable.querySelectorAll('tbody tr');
        
        // Получаем дни недели из заголовков
        const dayHeaders = Array.from(mainTable.querySelectorAll('thead th')).slice(2);
        const daysData = dayHeaders.map(header => {
          const link = header.querySelector('a');
          const linkText = link ? link.textContent.trim() : '';
          
          let dayName = '';
          let date = '';
          let fullDate = '';
          
          if (linkText) {
            const parts = linkText.split('-').map(part => part.trim());
            if (parts.length >= 2) {
              dayName = parts[0]; // "Пн"
              date = parts[1];    // "03.11"
            }
          }
          
          if (link && link.href) {
            const dateMatch = link.href.match(/schedule\/day\/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              fullDate = dateMatch[1];
            }
          }

          return {
            date: date,
            fullDate: fullDate,
            dayName: dayName,
            order: dayOrder[dayName] || 0,
            classes: []
          };
        });

        // Сортируем дни по порядку
        daysData.sort((a, b) => a.order - b.order);

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 2 && cells[0].classList.contains('text-center')) {
            const pairNumber = cells[0].textContent.trim();
            const timeRange = cells[1].textContent.trim();
            
            // Парсим занятия по дням недели
            for (let dayIndex = 0; dayIndex < daysData.length; dayIndex++) {
              const dayCell = cells[dayIndex + 2];
              
              if (dayCell && dayCell.textContent.trim() !== '') {
                const classData = parseClassCell(dayCell);
                if (classData) {
                  daysData[dayIndex].classes.push({
                    pairNumber: pairNumber,
                    timeRange: timeRange,
                    ...classData
                  });
                }
              }
            }
          }
        });

        // Добавляем только дни с занятиями
        schedule.days = daysData.filter(day => day.classes.length > 0);
      }

      // Парсинг вне сетки расписания (вторая таблица)
      const extraTables = document.querySelectorAll('table.table-bordered');
      if (extraTables.length > 1) {
        const extraTable = extraTables[1];
        const rows = extraTable.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
          const cell = row.querySelector('td');
          if (cell && cell.textContent.trim() !== '') {
            const classData = parseClassCell(cell);
            if (classData) {
              schedule.extraClasses.push(classData);
            }
          }
        });
      }

      return schedule;
    });
  }
}