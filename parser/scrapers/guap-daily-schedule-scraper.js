import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';
import { SessionManager } from '../core/session-manager.js'; 

export class GuapDailyScheduleScraper extends BaseScraper {
  constructor() {
    super();
  }

   async scrapeDailySchedule(credentials, date) {
    
    let page;
    
    try {
      await this.validateCredentials(credentials);
      
      const userId = this.getUserId(credentials);
      await SessionManager.debugSession(userId);
      
      page = await this.getAuthenticatedPage(credentials);

      await this.navigateToDailySchedule(page, date);
      
      const scheduleData = await this.parseDailySchedule(page);
      
      return {
        success: true,
        message: `✅ Расписание на ${date} загружено`,
        schedule: scheduleData,
        date: date,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      
      if (page) {
        await this.invalidateSession(credentials);
      }
      
      throw error;
    }
  }

async navigateToDailySchedule(page, date) {
    
    const scheduleUrl = `https://pro.guap.ru/inside/students/classes/schedule/day/${date}`;
    
    try {
      await page.goto(scheduleUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      

      await page.waitForFunction(() => {
        const table = document.querySelector('table.table-bordered');
        const noSchedule = document.querySelector('.alert.alert-info');
        const loading = document.querySelector('[class*="loading"], [class*="spinner"]');
        
        return table !== null || noSchedule !== null || !loading;
      }, { timeout: 15000, polling: 500 });
      
      
    } catch (error) {
      
      const pageContent = await page.content();
      
      throw error;
    }
  }

  async parseDailySchedule(page) {
    return await page.evaluate(() => {
      
      const classes = [];
      
      const noScheduleAlert = document.querySelector('.alert.alert-info');
      if (noScheduleAlert) {
        return classes;
      }

      const table = document.querySelector('table.table-bordered');
      
      if (!table) {
        return classes;
      }

      const rows = table.querySelectorAll('tbody tr');

      if (rows.length === 0) {
        const anyContent = table.textContent.trim();
        if (anyContent.includes('нет занятий') || anyContent.includes('занятий не найдено')) {
          return classes;
        }
      }
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 3) {
          const pairNumber = cells[0]?.textContent?.trim();
          const timeRange = cells[1]?.textContent?.trim();
          const classCell = cells[2];
          
          const cellText = classCell.textContent.trim();
          if (cellText !== '' && 
              !cellText.includes('нет занятий') && 
              !cellText.includes('занятий не найдено')) {
            
            const badge = classCell.querySelector('.badge');
            const subjectElement = classCell.querySelector('.fw-bolder');
            const teacherElement = classCell.querySelector('[class*="teacher"], .short-teacher');
            const groupBadge = classCell.querySelector('.badge.bg-dark');
            const locationElement = classCell.querySelector('.bi-geo-alt');
            
            let teacher = '';
            let teacherInfo = '';
            if (teacherElement) {
              teacher = teacherElement.childNodes[0]?.textContent?.trim() || '';
              
              const teacherSpan = teacherElement.querySelector('span');
              if (teacherSpan) {
                teacherInfo = teacherSpan.textContent.trim();
                teacherInfo = teacherInfo.replace(/[()]/g, '').trim();
              }
            }
            
            let building = '';
            let location = '';
            if (locationElement) {
              let locationText = '';
              let nextNode = locationElement.nextSibling;
              
              while (nextNode && nextNode.nodeType === 3) { 
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
            
            
            classes.push(classData);
          } else {
          }
        }
      });
      
      return classes;
    });
  }
}