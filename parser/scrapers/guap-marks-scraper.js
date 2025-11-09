// parser/scrapers/guap-marks-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapMarksScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

  async scrapeMarks(credentials, semester = null, contrType = 0, teacher = 0, mark = 0) {
    let browser;
    try {
      browser = await this.browserManager.launch();
      const page = await this.browserManager.createPage(browser);

      // Аутентификация
      const finalUrl = await this.authStrategy.login(page, credentials);
      
      if (!this.authStrategy.isLoginSuccessful(finalUrl)) {
        const errorText = await page.evaluate(() => {
          const errorElement = document.querySelector('.alert-error');
          return errorElement ? errorElement.textContent.trim() : null;
        });
        
        if (errorText) {
          throw new Error(errorText);
        }
        throw new Error('Неверный логин или пароль');
      }

      // Переход к оценкам с параметрами
      await this.navigateToMarks(page, semester, contrType, teacher, mark);
      
      // Парсинг данных оценок
      const marksData = await this.parseMarks(page);
      
      return {
        success: true,
        message: `✅ Успешный вход! Найдено предметов: ${marksData.length}`,
        marks: marksData,
        marksCount: marksData.length,
        filters: {
          semester,
          contrType,
          teacher,
          mark
        }
      };

    } catch (error) {
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async navigateToMarks(page, semester = null, contrType = 0, teacher = 0, mark = 0) {
    console.log('Переходим на страницу оценок...');
    
    let url = 'https://pro.guap.ru/inside/student/marks/new?';
    const params = new URLSearchParams();
    
    if (semester) params.append('semester', semester);
    if (contrType) params.append('contrType', contrType);
    if (teacher) params.append('teacher', teacher);
    if (mark) params.append('mark', mark);
    
    url += params.toString();
    
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Ждем загрузки карточек с оценками
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.card.shadow-sm.mb-2');
      return cards.length > 0;
    }, { timeout: 10000 });
  }

  async parseMarks(page) {
    return await page.evaluate(() => {
      const marks = [];
      
      // Находим все карточки с оценками
      const cards = document.querySelectorAll('.card.shadow-sm.mb-2');
      console.log(`Найдено карточек с оценками: ${cards.length}`);
      
      cards.forEach((card, index) => {
        try {
          // Название предмета и ссылка
          const subjectLink = card.querySelector('h5 a');
          const subjectName = subjectLink?.textContent?.trim() || '';
          const subjectUrl = subjectLink?.href || '';
          
          // Преподаватели
          const teachers = [];
          const teacherLinks = card.querySelectorAll('p.small a.link-switch-blue');
          teacherLinks.forEach(link => {
            teachers.push({
              name: link.textContent?.trim() || '',
              profileUrl: link.href || ''
            });
          });
          
          // Семестр
          const semesterElement = card.querySelector('.float-end .mt-2');
          const semester = semesterElement?.textContent?.trim() || '';
          
          // Тип контроля
          const controlTypeElement = card.querySelector('.flexRow-baseline span.text-center');
          const controlType = controlTypeElement?.textContent?.trim() || '';
          
          // Оценка
          const markElement = card.querySelector('.flexRow-baseline span.text-warning, .flexRow-baseline span.text-success, .flexRow-baseline span.text-danger');
          const mark = markElement?.textContent?.trim() || 'нет';
          const markClass = markElement?.className || '';
          
          // Зачетные единицы (З.Е.)
          const creditsElement = card.querySelector('.text-success');
          const credits = creditsElement?.textContent?.trim() || '';
          
          const markData = {
            subject: {
              name: subjectName,
              url: subjectUrl
            },
            teachers: teachers,
            semester: semester,
            controlType: controlType,
            mark: {
              value: mark,
              class: markClass
            },
            credits: credits
          };
          
          console.log(`Предмет ${index}:`, {
            subject: subjectName,
            controlType: controlType,
            mark: mark,
            credits: credits
          });
          
          marks.push(markData);
          
        } catch (error) {
          console.error(`Ошибка парсинга карточки ${index}:`, error);
        }
      });
      
      return marks;
    });
  }

  // Метод для получения доступных фильтров
  async getAvailableFilters(page) {
    return await page.evaluate(() => {
      const filters = {};
      
      // Семестры
      const semesterSelect = document.getElementById('semester');
      if (semesterSelect) {
        filters.semesters = Array.from(semesterSelect.options).map(option => ({
          value: option.value,
          text: option.textContent.trim(),
          selected: option.selected
        }));
      }
      
      // Типы контроля
      const contrTypeSelect = document.getElementById('contrType');
      if (contrTypeSelect) {
        filters.controlTypes = Array.from(contrTypeSelect.options).map(option => ({
          value: option.value,
          text: option.textContent.trim(),
          selected: option.selected
        }));
      }
      
      // Преподаватели
      const teacherSelect = document.getElementById('teacher');
      if (teacherSelect) {
        filters.teachers = Array.from(teacherSelect.options).map(option => ({
          value: option.value,
          text: option.textContent.trim(),
          selected: option.selected
        }));
      }
      
      // Оценки
      const markSelect = document.getElementById('mark');
      if (markSelect) {
        filters.marks = Array.from(markSelect.options).map(option => ({
          value: option.value,
          text: option.textContent.trim(),
          selected: option.selected
        }));
      }
      
      return filters;
    });
  }
}