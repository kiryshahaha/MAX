//parser/scrapers/guap-reports-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapReportsScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

  async scrapeReports(credentials) {
    let page;
    
    try {
      await this.validateCredentials(credentials);
      page = await this.getAuthenticatedPage(credentials);

      // Переход к отчетам
      await this.navigateToReports(page);
      
      // Получаем общее количество отчетов
      const totalReports = await this.getTotalReportsCount(page);
      console.log(`Общее количество отчетов: ${totalReports}`);
      
      // Парсинг данных с учетом пагинации
      const reportsData = await this.parseReportsWithPagination(page, totalReports);
      
      return {
        success: true,
        message: `✅ Успешный вход! Найдено отчетов: ${reportsData.length}`,
        reports: reportsData,
        reportsCount: reportsData.length,
        totalReports: totalReports
      };

    } catch (error) {
      if (page) {
        await this.invalidateSession(credentials);
      }
      throw error;
    }
  }

 async navigateToReports(page) {
    console.log('Переходим на страницу отчетов...');
    await page.goto('https://pro.guap.ru/inside/student/reports/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Ждем загрузки таблицы
    await page.waitForFunction(() => {
      const tables = document.querySelectorAll('table');
      return tables.length > 0;
    }, { timeout: 10000 });
  }

  async getTotalReportsCount(page) {
    return await page.evaluate(() => {
      const floatStartElement = document.querySelector('.float-start');
      if (floatStartElement) {
        const text = floatStartElement.textContent.trim();
        console.log('Текст в .float-start:', text);
        
        // Ищем число в тексте "Всего 14 записей"
        const match = text.match(/Всего\s+(\d+)\s+записей/);
        if (match) {
          return parseInt(match[1]);
        }
        
        // Альтернативные варианты текста
        const alternativeMatch = text.match(/(\d+)\s+записей/);
        if (alternativeMatch) {
          return parseInt(alternativeMatch[1]);
        }
        
        // Если есть просто число
        const numberMatch = text.match(/\d+/);
        if (numberMatch) {
          return parseInt(numberMatch[0]);
        }
      }
      
      // Если не нашли в .float-start, пробуем другие селекторы
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

    console.log(`Начинаем парсинг отчетов с пагинацией. Всего отчетов: ${totalReports}`);

    while (true) {
      console.log(`Парсим страницу ${currentPage}...`);

      // Парсим отчеты на текущей странице
      const pageReports = await this.parseReportsTable(page);
      console.log(`На странице ${currentPage} найдено отчетов: ${pageReports.length}`);
      
      // Добавляем отчеты с проверкой на дубликаты
      const newReports = pageReports.filter(report => 
        !allReports.some(existingReport => 
          existingReport.taskName === report.taskName && 
          existingReport.teacher === report.teacher &&
          existingReport.uploadDate === report.uploadDate
        )
      );
      
      allReports.push(...newReports);
      console.log(`Новых отчетов: ${newReports.length}, всего: ${allReports.length}`);

      // Проверяем, достигли ли общего количества отчетов
      if (allReports.length >= totalReports) {
        console.log(`Достигли общего количества отчетов (${allReports.length}/${totalReports}), завершаем парсинг`);
        break;
      }

      // Пытаемся перейти на следующую страницу
      const hasNextPage = await this.goToNextPage(page);
      
      if (!hasNextPage) {
        console.log('Следующая страница не найдена, завершаем парсинг');
        break;
      }

      currentPage++;
      
      // Ждем загрузки новой страницы
      await this.waitForPageLoad(page);
      
      // Ждем загрузки таблицы на новой странице
      try {
        await page.waitForFunction(() => {
          const tables = document.querySelectorAll('table');
          return tables.length > 0 && tables[0].querySelectorAll('tbody tr').length > 0;
        }, { timeout: 10000 });
      } catch (error) {
        console.log('Таблица не загрузилась после перехода, завершаем парсинг');
        break;
      }
    }

    console.log(`Парсинг завершен. Всего собрано отчетов: ${allReports.length}`);
    return allReports;
  }

  async goToNextPage(page) {
    return await page.evaluate(() => {
      // Ищем активную кнопку следующей страницы
      const paginationItems = document.querySelectorAll('.page-item');
      let nextButton = null;
      
      // Сначала ищем кнопку "Next" или стрелку
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
      
      // Если не нашли next, берем последнюю доступную страницу
      if (!nextButton) {
        const lastPageItem = document.querySelector('.page-item:last-child:not(.disabled)');
        if (lastPageItem && !lastPageItem.classList.contains('active')) {
          nextButton = lastPageItem.querySelector('.page-link');
        }
      }
      
      // Если нашли подходящую кнопку - кликаем
      if (nextButton) {
        nextButton.click();
        return true;
      }
      
      return false;
    });
  }

  async waitForPageLoad(page) {
    // Ждем либо по таймауту, либо пока не пропадет индикатор загрузки
    if (page.waitForTimeout) {
      await page.waitForTimeout(2000);
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Дополнительно ждем, пока не завершатся сетевые запросы
    try {
      await page.waitForNetworkIdle({ timeout: 5000 });
    } catch (error) {
      console.log('Не дождались завершения сетевых запросов, продолжаем...');
    }
  }

  async parseReportsTable(page) {
    return await page.evaluate(() => {
      const reports = [];
      const tables = document.querySelectorAll('table');
      
      if (tables.length === 0) {
        console.log('Таблицы не найдены');
        return reports;
      }

      const rows = tables[0].querySelectorAll('tbody tr');
      console.log(`Найдено строк в таблице: ${rows.length}`);
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        console.log(`Строка ${index}: ${cells.length} ячеек`);
        
        // Определяем структуру колонок на основе HTML
        if (cells.length >= 7) {
          let downloadButton, removeButton, numberElement, taskLink;
          let teacherLink, statusBadge, scoreElement, uploadDateElement;

          // Анализируем структуру по классам и содержимому
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const cellContent = cell.textContent?.trim() || '';
            
            // Действия (первая ячейка с кнопками)
            if (i === 0) {
              downloadButton = cell.querySelector('a.btn-outline-dark');
              removeButton = cell.querySelector('a.btn-danger');
            }
            // Номер (текст с числом, обычно центрирован)
            else if (i === 1 && cell.querySelector('span.text-center') && /^\d+$/.test(cellContent)) {
              numberElement = cell.querySelector('span.text-center');
            }
            // Задание (ссылка с классом blue-link)
            else if (i === 2 && cell.querySelector('a.blue-link')) {
              taskLink = cell.querySelector('a.blue-link');
            }
            // Преподаватель (ссылка с классом blue-link в центрированной ячейке)
            else if (i === 3 && cell.classList.contains('text-center') && cell.querySelector('a.blue-link')) {
              teacherLink = cell.querySelector('a.blue-link');
            }
            // Статус (бейдж)
            else if (i === 4 && cell.querySelector('.badge')) {
              statusBadge = cell.querySelector('.badge');
            }
            // Баллы (текст в центрированной ячейке)
            else if (i === 5 && cell.classList.contains('text-center')) {
              scoreElement = cell.querySelector('span');
            }
            // Дата загрузки (текст в центрированной ячейке)
            else if (i === 6 && cell.classList.contains('text-center')) {
              uploadDateElement = cell.querySelector('span');
            }
          }

          const report = {
            // Действия
            downloadButton: downloadButton?.href || '',
            removeButton: removeButton?.href || '',
            
            // Номер
            number: numberElement?.textContent?.trim() || '',
            
            // Задание
            taskName: taskLink?.textContent?.trim() || '',
            taskLink: taskLink?.href || '',
            
            // Преподаватель
            teacher: teacherLink?.textContent?.trim() || '',
            teacherLink: teacherLink?.href || '',
            
            // Статус
            status: statusBadge?.textContent?.trim() || '',
            statusClass: statusBadge?.className || '',
            
            // Баллы
            score: scoreElement?.textContent?.trim() || '―',
            
            // Дата загрузки
            uploadDate: uploadDateElement?.textContent?.trim() || ''
          };
          
          console.log(`Отчет ${index}:`, {
            taskName: report.taskName,
            teacher: report.teacher,
            status: report.status,
            score: report.score,
            uploadDate: report.uploadDate
          });
          
          // Добавляем отчет если есть хотя бы название задания
          if (report.taskName) {
            reports.push(report);
          }
        }
      });
      
      return reports;
    });
  }
}