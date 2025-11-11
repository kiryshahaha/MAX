//parser/scrapers/guap-tasks-scraper.js
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
      
      // Используем существующую сессию или создаем новую
      page = await this.getAuthenticatedPage(credentials);
      
      // Переход к задачам (уже аутентифицированы)
      await this.navigateToTasks(page);
      
      // Получаем общее количество задач
      const totalTasks = await this.getTotalTasksCount(page);
      console.log(`Общее количество задач: ${totalTasks}`);
      
      // Парсинг данных с учетом пагинации
      const tasksData = await this.parseTasksWithPagination(page, totalTasks);
      
      return {
        success: true,
        message: `✅ Успешный вход! Найдено заданий: ${tasksData.length}`,
        tasks: tasksData,
        tasksCount: tasksData.length,
        totalTasks: totalTasks
      };

    } catch (error) {
      // При ошибке инвалидируем сессию
      if (page) {
        await this.invalidateSession(credentials);
      }
      throw error;
    }
    // Не закрываем страницу - она остается в сессии для повторного использования
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
    console.log('Переходим на страницу заданий...');
    await page.goto('https://pro.guap.ru/inside/student/tasks/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Ждем загрузки таблицы
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
        console.log('Текст в .float-start:', text);
        
        // Ищем число в тексте "Всего 31 записей"
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

  async parseTasksWithPagination(page, totalTasks) {
    const allTasks = [];
    let currentPage = 1;

    console.log(`Начинаем парсинг задач с пагинацией. Всего задач: ${totalTasks}`);

    while (true) {
      console.log(`Парсим страницу ${currentPage}...`);

      // Парсим задачи на текущей странице
      const pageTasks = await this.parseTasksTable(page);
      console.log(`На странице ${currentPage} найдено задач: ${pageTasks.length}`);
      
      // Добавляем задачи с проверкой на дубликаты
      const newTasks = pageTasks.filter(task => 
        !allTasks.some(existingTask => 
          existingTask.subject === task.subject && 
          existingTask.taskType === task.taskType &&
          existingTask.deadline === task.deadline
        )
      );
      
      allTasks.push(...newTasks);
      console.log(`Новых задач: ${newTasks.length}, всего: ${allTasks.length}`);

      // Проверяем, достигли ли общего количества задач
      if (allTasks.length >= totalTasks) {
        console.log(`Достигли общего количества задач (${allTasks.length}/${totalTasks}), завершаем парсинг`);
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

    console.log(`Парсинг завершен. Всего собрано задач: ${allTasks.length}`);
    return allTasks;
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

async parseTasksTable(page) {
  return await page.evaluate(() => {
    const tasks = [];
    const tables = document.querySelectorAll('table');
    
    if (tables.length === 0) {
      console.log('Таблицы не найдены');
      return tasks;
    }

    const rows = tables[0].querySelectorAll('tbody tr');
    console.log(`Найдено строк в таблице: ${rows.length}`);
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      console.log(`Строка ${index}: ${cells.length} ячеек`);
      
      // Определяем структуру колонок на основе HTML
      if (cells.length >= 9) {
        let actionButton, subjectLink, numberElement, taskLink, statusBadge;
        let scoreElement, taskTypeElement, additionalStatusElement;
        let deadlineElement, updateTimeElement, teacherLink;

        // Анализируем структуру по классам и содержимому
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const cellContent = cell.textContent?.trim() || '';
          
          // Кнопка действия (первая ячейка с кнопкой)
          if (i === 0 && cell.querySelector('a.btn')) {
            actionButton = cell.querySelector('a.btn');
          }
          // Дисциплина (ссылка с классом blue-link)
          else if (i === 1 && cell.querySelector('a.blue-link')) {
            subjectLink = cell.querySelector('a.blue-link');
            
            // Ищем преподавателя в ячейке дисциплины
            const cellHTML = cell.innerHTML;
            const teacherMatch = cellHTML.match(/<br>\s*<a[^>]*class="blue-link"[^>]*>([^<]*)<\/a>/);
            if (teacherMatch) {
              teacherLink = cell.querySelector('a.blue-link:nth-child(2)');
            }
          }
          // Номер задания (текст с числом, обычно центрирован)
          else if (i === 2 && cell.classList.contains('text-center') && /^\d+$/.test(cellContent)) {
            numberElement = cell;
          }
          // Название задания (ссылка с классом link-switch-blue)
          else if (i === 3 && cell.querySelector('a.link-switch-blue')) {
            taskLink = cell.querySelector('a.link-switch-blue');
          }
          // Статус (бейдж)
          else if (i === 4 && cell.querySelector('.badge')) {
            statusBadge = cell.querySelector('.badge');
          }
          // Баллы (содержит "/")
          else if (i === 5 && cellContent.includes('/')) {
            scoreElement = cell;
          }
          // Тип задания (текст как "Лабораторная работа")
          else if (i === 6 && ['Лабораторная работа', 'Практическая работа', 'Домашнее задание', 'Курсовой проект (работа)'].some(type => 
            cellContent.includes(type))) {
            taskTypeElement = cell;
          }
          // Дедлайн (span с text-warning/text-danger ИЛИ просто text-center если нет дедлайна)
          else if (i === 7 && (cell.querySelector('span.text-warning') || cell.querySelector('span.text-danger') || 
                  (cell.classList.contains('text-center') && !cell.querySelector('time') && !cell.querySelector('.badge')))) {
            deadlineElement = cell;
          }
          // Дата обновления (time элемент)
          else if (i === 8 && cell.querySelector('time')) {
            updateTimeElement = cell.querySelector('time');
          }
          // Преподаватель (отдельная колонка)
          else if (i === 9 && cell.querySelector('a.blue-link')) {
            teacherLink = cell.querySelector('a.blue-link');
          }
        }

        // Если не нашли преподавателя в отдельной колонке, ищем в ячейке дисциплины
        if (!teacherLink && subjectLink && subjectLink.parentElement) {
          const disciplineCell = subjectLink.parentElement;
          const allLinks = disciplineCell.querySelectorAll('a.blue-link');
          if (allLinks.length > 1) {
            teacherLink = allLinks[1];
          }
        }

        // Обработка дедлайна
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

        // Получаем дату обновления
        let updatedAt = '';
        if (updateTimeElement) {
          updatedAt = updateTimeElement.textContent?.trim();
        }

        // Извлекаем ID задачи из ссылки
        let taskId = null;
        if (taskLink?.href) {
          const taskIdMatch = taskLink.href.match(/\/tasks\/(\d+)/);
          if (taskIdMatch) {
            taskId = parseInt(taskIdMatch[1]);
          }
        }

        // Извлекаем баллы
        let achievedScore = 0;
        let maxScore = 0;
        if (scoreElement?.textContent) {
          const scoreMatch = scoreElement.textContent.trim().match(/(\d+)\s*\/\s*(\d+)/);
          if (scoreMatch) {
            achievedScore = parseInt(scoreMatch[1]);
            maxScore = parseInt(scoreMatch[2]);
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

        // Формируем задачу в новом формате
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
            date: null, // Можно парсить дату из deadline если нужно
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
        
        console.log(`Задача ${index}:`, {
          id: task.task.id,
          name: task.task.name,
          status: task.status.text,
          deadline: task.deadline.text,
          score: `${task.score.achieved}/${task.score.max}`
        });
        
        // Добавляем задачу если есть хотя бы дисциплина или название задания
        if (task.subject.name || task.task.name) {
          tasks.push(task);
        }
      }
    });
    
    return tasks;
  });
}
}