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

      await this.navigateToSchedule(page, year, week);
      
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

      const parseClassCell = (cell) => {
      try {
        const badge = cell.querySelector('.badge.bg-primary');
        const type = badge ? badge.textContent.trim() : '';

        const subjectElement = cell.querySelector('.fw-bolder');
        const subject = subjectElement ? subjectElement.textContent.trim() : '';

        const teacherElement = cell.querySelector('[class*="teacher"], .short-teacher');
        let teacher = '';
        let teacherInfo = '';
        
        if (teacherElement) {
          const teacherText = teacherElement.childNodes[0]?.textContent?.trim() || '';
          teacher = teacherText.replace('Жучкова М.Г.', 'Жучкова М.Г.').trim(); 
          
          const teacherSpan = teacherElement.querySelector('span');
          if (teacherSpan) {
            teacherInfo = teacherSpan.textContent.trim();
            teacherInfo = teacherInfo.replace(/[()]/g, '').trim();
          }
        }

        const groupBadge = cell.querySelector('.badge.bg-dark');
        const group = groupBadge ? groupBadge.textContent.trim() : '';

        const locationElement = cell.querySelector('.bi-geo-alt');
        let building = '';
        let location = '';
        
        if (locationElement && locationElement.parentElement) {
          const locationText = locationElement.nextSibling?.textContent?.trim() || '';
          
          if (locationText) {
            const parts = locationText.split(',');
            if (parts.length >= 2) {
              building = parts[0].trim();
              location = parts[1].trim();
            } else {
              const words = locationText.split(' ');
              if (words.length > 1) {
                const lastWord = words[words.length - 1];
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
        return null;
      }
    };

      const dayOrder = {
        'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6, 'Вс': 7
      };

      const schedule = {
        days: [],
        extraClasses: []
      };

      const mainTable = document.querySelector('table.table-bordered');
      if (mainTable) {
        const rows = mainTable.querySelectorAll('tbody tr');
        
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
              dayName = parts[0]; 
              date = parts[1];    
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

        daysData.sort((a, b) => a.order - b.order);

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 2 && cells[0].classList.contains('text-center')) {
            const pairNumber = cells[0].textContent.trim();
            const timeRange = cells[1].textContent.trim();
            
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

        schedule.days = daysData.filter(day => day.classes.length > 0);
      }

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