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
          existingReport.task?.id === report.task?.id
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
      
      // Для отладки - выводим содержимое всех ячеек
      console.log(`Содержимое ячеек строки ${index}:`);
      cells.forEach((cell, cellIndex) => {
        console.log(`Ячейка ${cellIndex}:`, cell.textContent?.trim());
      });

      // Определяем структуру колонок на основе HTML
      if (cells.length >= 7) {
        let downloadButton, numberElement, taskLink;
        let teacherLink, statusBadge, scoreElement, uploadDateElement;

        // Анализируем структуру по классам и содержимому
        // Ячейка 0: Действия
        if (cells[0]) {
          downloadButton = cells[0].querySelector('a.btn-outline-dark');
        }
        
        // Ячейка 1: Номер
        if (cells[1]) {
          numberElement = cells[1].querySelector('span.text-center');
        }
        
        // Ячейка 2: Задание
        if (cells[2]) {
          taskLink = cells[2].querySelector('a.blue-link');
        }
        
        // Ячейка 3: Преподаватель
        if (cells[3]) {
          teacherLink = cells[3].querySelector('a.blue-link');
        }
        
        // Ячейка 4: Статус
        if (cells[4]) {
          statusBadge = cells[4].querySelector('.badge');
        }
        
        // Ячейка 5: Баллы
        if (cells[5]) {
          scoreElement = cells[5].querySelector('span');
        }
        
        // Ячейка 6: Дата загрузки
        if (cells[6]) {
          const textCenterDiv = cells[6].querySelector('.text-center');
          if (textCenterDiv) {
            uploadDateElement = textCenterDiv.querySelector('span');
          }
          // Если не нашли span, используем текст из ячейки
          if (!uploadDateElement) {
            uploadDateElement = { textContent: cells[6].textContent?.trim() || '' };
          }
        }

        // Извлекаем ID задачи из ссылки
        let taskId = null;
        if (taskLink?.href) {
          const taskIdMatch = taskLink.href.match(/\/tasks\/(\d+)/);
          if (taskIdMatch) {
            taskId = parseInt(taskIdMatch[1]);
          }
        }

        // Определяем статус
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

        // Обработка баллов
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

        // Получаем дату загрузки
        let uploadDateText = '';
        if (uploadDateElement) {
          uploadDateText = uploadDateElement.textContent?.trim() || '';
          console.log(`Дата загрузки для строки ${index}: "${uploadDateText}"`);
        }

        // Определяем тип задания из названия
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
        
        console.log(`Отчет ${index}:`, {
          id: report.task.id,
          name: report.task.name,
          status: report.status.text,
          score: `${report.score.achieved}/${report.score.max}`,
          upload_date: report.load_date.text,
          has_attachment: report.attachments.has_attachment
        });
        
        // Добавляем отчет если есть хотя бы название задания
        if (report.task.name) {
          reports.push(report);
        }
      }
    });
    
    return reports;
  });
}
}