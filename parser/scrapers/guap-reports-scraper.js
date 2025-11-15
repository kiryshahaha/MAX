import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapReportsScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

  async scrapeReports(credentials) {
    let page;
    let shouldInvalidateSession = false;
    
    try {
      await this.validateCredentials(credentials);
      
      page = await this.getAuthenticatedPage(credentials);
      
      if (!page || page.isClosed()) {
        throw new Error('Страница не доступна или закрыта');
      }

      const currentUrl = page.url();
      if (!currentUrl.includes('guap.ru')) {
        shouldInvalidateSession = true;
        throw new Error('Сессия утеряна');
      }

      await this.navigateToReports(page);
      
      const totalReports = await this.getTotalReportsCount(page);
      
      const reportsData = await this.parseReportsWithPagination(page, totalReports);
      
      return {
        success: true,
        message: `✅ Успешный вход! Найдено отчетов: ${reportsData.length}`,
        reports: reportsData,
        reportsCount: reportsData.length,
        totalReports: totalReports
      };

    } catch (error) {
      
      if (shouldInvalidateSession || error.message.includes('detached') || error.message.includes('утеряна')) {
        await this.invalidateSession(credentials);
      }
      
      throw new Error(`⚠️ Ошибка при выполнении скрипта: ${error.message}`);
    }
  }

  async navigateToReports(page) {
    
    try {
      if (page.isClosed()) {
        throw new Error('Страница закрыта');
      }

      const currentUrl = page.url();
      if (currentUrl.includes('/reports')) {
        return;
      }

      await page.goto('https://pro.guap.ru/inside/student/reports/', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });


      await this.waitForReportsPageLoad(page);

    } catch (error) {
      if (page.isClosed()) {
        throw new Error('Страница была закрыта во время навигации');
      }
      
      const pageTitle = await page.title();
      
      const hasContent = await page.evaluate(() => {
        return document.body.textContent.length > 0;
      });
      
      if (!hasContent) {
        throw new Error('Страница загрузилась без контента');
      }
      
      throw error;
    }
  }

  async waitForReportsPageLoad(page) {
    
    try {
      await page.waitForFunction(() => {
        const tables = document.querySelectorAll('table');
        const hasTable = tables.length > 0;
        
        const bodyText = document.body.textContent;
        const hasError = bodyText.includes('Ошибка') || 
                        bodyText.includes('error') || 
                        bodyText.includes('логин') ||
                        bodyText.includes('login');
        
        return hasTable || hasError;
      }, { timeout: 15000 });

      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('auth')) {
        throw new Error('Сессия истекла, требуется повторная аутентификация');
      }

      const hasTable = await page.evaluate(() => {
        return document.querySelectorAll('table').length > 0;
      });

      if (!hasTable) {
        const pageContent = await page.evaluate(() => document.body.textContent);
        if (pageContent.includes('нет доступа') || pageContent.includes('не авторизован')) {
          throw new Error('Нет доступа к странице отчетов');
        }
      }


    } catch (error) {
      throw error;
    }
  }

  async getTotalReportsCount(page) {
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

  async parseReportsWithPagination(page, totalReports) {
    const allReports = [];
    let currentPage = 1;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 2;


    while (true) {

      try {
        const pageReports = await this.parseReportsTable(page);
        
        const newReports = pageReports.filter(report => 
          !allReports.some(existingReport => 
            existingReport.task?.id === report.task?.id
          )
        );
        
        allReports.push(...newReports);
        
        consecutiveErrors = 0;

        if (allReports.length >= totalReports) {
          break;
        }

        const hasNextPage = await this.goToNextPage(page);
        
        if (!hasNextPage) {
          break;
        }

        currentPage++;
        
        await this.waitForPageLoad(page);

      } catch (error) {
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          break;
        }
        
        const hasNextPage = await this.goToNextPage(page);
        if (!hasNextPage) break;
        
        currentPage++;
        await this.waitForPageLoad(page);
      }
    }

    return allReports;
  }

  async goToNextPage(page) {
    try {
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
    } catch (error) {
      return false;
    }
  }

  async waitForPageLoad(page) {
    
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
    } catch (error) {
    }
    
    try {
      await page.waitForFunction(() => {
        const tables = document.querySelectorAll('table');
        return tables.length > 0 && tables[0].querySelectorAll('tbody tr').length > 0;
      }, { timeout: 10000 });
    } catch (error) {
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async parseReportsTable(page) {
  return await page.evaluate(() => {
    const reports = [];
    const tables = document.querySelectorAll('table');
    
    if (tables.length === 0) {
      return reports;
    }

    const rows = tables[0].querySelectorAll('tbody tr');
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      
      cells.forEach((cell, cellIndex) => {
      });

      if (cells.length >= 7) {
        let downloadButton, numberElement, taskLink;
        let teacherLink, statusBadge, scoreElement, uploadDateElement;

        if (cells[0]) {
          downloadButton = cells[0].querySelector('a.btn-outline-dark');
        }
        
        if (cells[1]) {
          numberElement = cells[1].querySelector('span.text-center');
        }
        
        if (cells[2]) {
          taskLink = cells[2].querySelector('a.blue-link');
        }
        
        if (cells[3]) {
          teacherLink = cells[3].querySelector('a.blue-link');
        }
        
        if (cells[4]) {
          statusBadge = cells[4].querySelector('.badge');
        }
        
        if (cells[5]) {
          scoreElement = cells[5].querySelector('span');
        }
        
        if (cells[6]) {
          const textCenterDiv = cells[6].querySelector('.text-center');
          if (textCenterDiv) {
            uploadDateElement = textCenterDiv.querySelector('span');
          }
          if (!uploadDateElement) {
            uploadDateElement = { textContent: cells[6].textContent?.trim() || '' };
          }
        }

        let taskId = null;
        if (taskLink?.href) {
          const taskIdMatch = taskLink.href.match(/\/tasks\/(\d+)/);
          if (taskIdMatch) {
            taskId = parseInt(taskIdMatch[1]);
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

        let achievedScore = null;
        let maxScore = null;
        let isEmpty = true;
        
        const scoreText = scoreElement?.textContent?.trim() || '';
        if (scoreText && scoreText !== '―') {
          const scoreMatch = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
          if (scoreMatch) {
            achievedScore = parseInt(scoreMatch[1]);
            maxScore = parseInt(scoreMatch[2]);
            isEmpty = false;
          }
        }

        let uploadDateText = '';
        if (uploadDateElement) {
          uploadDateText = uploadDateElement.textContent?.trim() || '';
        }

        let taskType = '';
        const taskName = taskLink?.textContent?.trim() || '';
        if (taskName.toLowerCase().includes('лаб')) {
          taskType = 'Лабораторная работа';
        } else if (taskName.toLowerCase().includes('практ')) {
          taskType = 'Практическая работа';
        } else if (taskName.toLowerCase().includes('дом')) {
          taskType = 'Домашнее задание';
        } else if (taskName.toLowerCase().includes('курс')) {
          taskType = 'Курсовой проект (работа)';
        }

        const report = {
          task: {
            id: taskId,
            number: numberElement?.textContent?.trim() ? parseInt(numberElement.textContent.trim()) : null,
            name: taskName,
            type: taskType,
            link: taskLink?.href || ''
          },
          teacher: {
            full_name: teacherLink?.textContent?.trim() || '',
            link: teacherLink?.href || ''
          },
          load_date: {
            date: null,
            text: uploadDateText
          },
          score: {
            achieved: achievedScore,
            max: maxScore,
            is_empty: isEmpty
          },
          status: {
            code: statusCode,
            text: statusText,
            additional_text: ''
          },
          attachments: {
            download_url: downloadButton?.href || '',
            has_attachment: !!downloadButton
          }
        };
        
        
        if (report.task.name) {
          reports.push(report);
        }
      }
    });
    
    return reports;
  });
}


  async invalidateSession(credentials) {
    try {
      const userId = this.getUserId(credentials);
      const session = this.sessionManager.sessions.get(userId);
      if (session && session.page && !session.page.isClosed()) {
        await session.page.close();
        this.sessionManager.sessions.delete(userId);
      } else {
      }
    } catch (error) {
    }
  }
}