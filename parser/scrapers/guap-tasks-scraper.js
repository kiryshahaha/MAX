import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapTasksScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

   async scrapeTasks(credentials) {
    let page;
    
    try {
      await this.validateCredentials(credentials);
      
      page = await this.getAuthenticatedPage(credentials);
      
      await this.navigateToTasks(page);
      
      const totalTasks = await this.getTotalTasksCount(page);
      
      const tasksData = await this.parseTasksWithPagination(page, totalTasks);
      
      return {
        success: true,
        message: `✅ Успешный вход! Найдено заданий: ${tasksData.length}`,
        tasks: tasksData,
        tasksCount: tasksData.length,
        totalTasks: totalTasks
      };

    } catch (error) {
      if (page) {
        await this.invalidateSession(credentials);
      }
      throw error;
    }
  }

    async invalidateSession(credentials) {
    const userId = this.getUserId(credentials);
    const session = this.sessionManager.sessions.get(userId);
    if (session) {
      await session.page.close();
      this.sessionManager.sessions.delete(userId);
    }
  }

async navigateToTasks(page) {
    await page.goto('https://pro.guap.ru/inside/student/tasks/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    await page.waitForFunction(() => {
      const tables = document.querySelectorAll('table');
      return tables.length > 0;
    }, { timeout: 10000 });
  }

  async getTotalTasksCount(page) {
    return await page.evaluate(() => {
      const floatStartElement = document.querySelector('.float-start');
      if (floatStartElement) {
        const text = floatStartElement.textContent.trim();
        
        const match = text.match(/Всего\s+(\d+)\s+записей/);
        if (match) {
          return parseInt(match[1]);
        }
        
        const alternativeMatch = text.match(/(\d+)\s+записей/);
        if (alternativeMatch) {
          return parseInt(alternativeMatch[1]);
        }
        
        const numberMatch = text.match(/\d+/);
        if (numberMatch) {
          return parseInt(numberMatch[0]);
        }
      }
      
      const otherSelectors = ['.dataTables_info', '.pagination-info', '.total-records'];
      for (const selector of otherSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          const match = text.match(/(\d+)\s+записей/);
          if (match) return parseInt(match[1]);
        }
      }
      
      return 0;
    });
  }

  async parseTasksWithPagination(page, totalTasks) {
    const allTasks = [];
    let currentPage = 1;


    while (true) {

      const pageTasks = await this.parseTasksTable(page);
      
      const newTasks = pageTasks.filter(task => 
        !allTasks.some(existingTask => 
          existingTask.subject === task.subject && 
          existingTask.taskType === task.taskType &&
          existingTask.deadline === task.deadline
        )
      );
      
      allTasks.push(...newTasks);

      if (allTasks.length >= totalTasks) {
        break;
      }

      const hasNextPage = await this.goToNextPage(page);
      
      if (!hasNextPage) {
        break;
      }

      currentPage++;
      
      await this.waitForPageLoad(page);
      
      try {
        await page.waitForFunction(() => {
          const tables = document.querySelectorAll('table');
          return tables.length > 0 && tables[0].querySelectorAll('tbody tr').length > 0;
        }, { timeout: 10000 });
      } catch (error) {
        break;
      }
    }

    return allTasks;
  }

  async goToNextPage(page) {
    return await page.evaluate(() => {
      const paginationItems = document.querySelectorAll('.page-item');
      let nextButton = null;
      
      for (const item of paginationItems) {
        const link = item.querySelector('.page-link');
        if (!link) continue;
        
        const text = link.textContent.trim();
        const ariaLabel = link.getAttribute('aria-label') || '';
        
        const isNextButton = (
          ariaLabel.toLowerCase().includes('next') || 
          text === '›' || 
          text === '»' || 
          text.toLowerCase().includes('следующая')
        );
        
        if (isNextButton && !item.classList.contains('disabled') && !item.classList.contains('active')) {
          nextButton = link;
          break;
        }
      }
      
      if (!nextButton) {
        const lastPageItem = document.querySelector('.page-item:last-child:not(.disabled)');
        if (lastPageItem && !lastPageItem.classList.contains('active')) {
          nextButton = lastPageItem.querySelector('.page-link');
        }
      }
      
      if (nextButton) {
        nextButton.click();
        return true;
      }
      
      return false;
    });
  }

  async waitForPageLoad(page) {
    if (page.waitForTimeout) {
      await page.waitForTimeout(2000);
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    try {
      await page.waitForNetworkIdle({ timeout: 5000 });
    } catch (error) {
    }
  }

async parseTasksTable(page) {
  return await page.evaluate(() => {
    const tasks = [];
    const tables = document.querySelectorAll('table');
    
    if (tables.length === 0) {
      return tasks;
    }

    const rows = tables[0].querySelectorAll('tbody tr');
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      
      if (cells.length >= 9) {
        let actionButton, subjectLink, numberElement, taskLink, statusBadge;
        let scoreElement, taskTypeElement, additionalStatusElement;
        let deadlineElement, updateTimeElement, teacherLink;

        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const cellContent = cell.textContent?.trim() || '';
          
          if (i === 0 && cell.querySelector('a.btn')) {
            actionButton = cell.querySelector('a.btn');
          }
          else if (i === 1 && cell.querySelector('a.blue-link')) {
            subjectLink = cell.querySelector('a.blue-link');
            
            const cellHTML = cell.innerHTML;
            const teacherMatch = cellHTML.match(/<br>\s*<a[^>]*class="blue-link"[^>]*>([^<]*)<\/a>/);
            if (teacherMatch) {
              teacherLink = cell.querySelector('a.blue-link:nth-child(2)');
            }
          }
          else if (i === 2 && cell.classList.contains('text-center') && /^\d+$/.test(cellContent)) {
            numberElement = cell;
          }
          else if (i === 3 && cell.querySelector('a.link-switch-blue')) {
            taskLink = cell.querySelector('a.link-switch-blue');
          }
          else if (i === 4 && cell.querySelector('.badge')) {
            statusBadge = cell.querySelector('.badge');
          }
          else if (i === 5 && cellContent.includes('/')) {
            scoreElement = cell;
          }
          else if (i === 6 && ['Лабораторная работа', 'Практическая работа', 'Домашнее задание', 'Курсовой проект (работа)'].some(type => 
            cellContent.includes(type))) {
            taskTypeElement = cell;
          }
          else if (i === 7 && (cell.querySelector('span.text-warning') || cell.querySelector('span.text-danger') || 
                  (cell.classList.contains('text-center') && !cell.querySelector('time') && !cell.querySelector('.badge')))) {
            deadlineElement = cell;
          }
          else if (i === 8 && cell.querySelector('time')) {
            updateTimeElement = cell.querySelector('time');
          }
          else if (i === 9 && cell.querySelector('a.blue-link')) {
            teacherLink = cell.querySelector('a.blue-link');
          }
        }

        if (!teacherLink && subjectLink && subjectLink.parentElement) {
          const disciplineCell = subjectLink.parentElement;
          const allLinks = disciplineCell.querySelectorAll('a.blue-link');
          if (allLinks.length > 1) {
            teacherLink = allLinks[1];
          }
        }

        let deadline = 'Спи спокойно';
        let deadlineClass = '';
        if (deadlineElement) {
          const deadlineSpan = deadlineElement.querySelector('span');
          if (deadlineSpan) {
            deadline = deadlineSpan.textContent?.trim();
            deadlineClass = deadlineSpan.className || '';
          } else if (deadlineElement.classList.contains('text-center')) {
            deadline = 'Спи спокойно';
            deadlineClass = '';
          }
        }

        let updatedAt = '';
        if (updateTimeElement) {
          updatedAt = updateTimeElement.textContent?.trim();
        }

        let taskId = null;
        if (taskLink?.href) {
          const taskIdMatch = taskLink.href.match(/\/tasks\/(\d+)/);
          if (taskIdMatch) {
            taskId = parseInt(taskIdMatch[1]);
          }
        }

        let achievedScore = 0;
        let maxScore = 0;
        if (scoreElement?.textContent) {
          const scoreMatch = scoreElement.textContent.trim().match(/(\d+)\s*\/\s*(\d+)/);
          if (scoreMatch) {
            achievedScore = parseInt(scoreMatch[1]);
            maxScore = parseInt(scoreMatch[2]);
          }
        }

        let statusCode = 'unknown';
        let statusText = statusBadge?.textContent?.trim() || '';
        
        if (statusText.toLowerCase().includes('принят') || statusText.toLowerCase().includes('accepted')) {
          statusCode = 'accepted';
        } else if (statusText.toLowerCase().includes('проверяется') || statusText.toLowerCase().includes('checking')) {
          statusCode = 'checking';
        } else if (statusText.toLowerCase().includes('отправлен') || statusText.toLowerCase().includes('submitted')) {
          statusCode = 'submitted';
        } else if (statusText.toLowerCase().includes('не отправлен') || statusText.toLowerCase().includes('not submitted')) {
          statusCode = 'not_submitted';
        }

        const task = {
          task: {
            id: taskId,
            number: numberElement?.textContent?.trim() ? parseInt(numberElement.textContent.trim()) : null,
            name: taskLink?.textContent?.trim() || '',
            type: taskTypeElement?.textContent?.trim() || '',
            link: taskLink?.href || '',
            created_at: updatedAt || new Date().toISOString()
          },
          subject: {
            name: subjectLink?.textContent?.trim() || '',
            link: subjectLink?.href || ''
          },
          teacher: {
            full_name: teacherLink?.textContent?.trim() || '',
            link: teacherLink?.href || ''
          },
          deadline: {
            date: null, 
            text: deadline
          },
          score: {
            achieved: achievedScore,
            max: maxScore
          },
          status: {
            code: statusCode,
            text: statusText,
            additional_text: ''
          }
        };
        
       
        
        if (task.subject.name || task.task.name) {
          tasks.push(task);
        }
      }
    });
    
    return tasks;
  });
}
}