// parser/scrapers/guap-marks-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapMarksScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

  async scrapeMarks(credentials, semester = null, contrType = 0, teacher = 0, mark = 0) {
    let page;
    
    try {
      await this.validateCredentials(credentials);
      page = await this.getAuthenticatedPage(credentials);

      // Переход к оценкам с параметрами (используем числовые значения из констант)
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
      if (page) {
        await this.invalidateSession(credentials);
      }
      throw error;
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
          const subjectCode = subjectUrl.split('/').pop() || '';
          
          // Преподаватели
          const teachers = [];
          const teacherElements = card.querySelectorAll('p.small a.link-switch-blue');
          teacherElements.forEach(link => {
            const profileUrl = link.href || '';
            const profileId = profileUrl.split('/').pop() || '';
            let name = link.textContent?.trim() || '';
            
            // Пытаемся извлечь должность из текста (если есть)
            let position = null;
            const teacherText = link.closest('p')?.textContent || '';
            
            // Валидация и очистка данных преподавателя
            name = name.replace(/\s+/g, ' ').trim();
            
            // Извлечение должности из имени, если она там есть
            if (name.includes('-')) {
              const parts = name.split('-');
              if (parts.length > 1) {
                name = parts[0].trim();
                position = parts[1].trim();
              }
            }
            
            // Если позиция не определена, но есть в тексте через запятую
            if (!position && name.includes(',')) {
              const parts = name.split(',');
              if (parts.length > 1) {
                name = parts[0].trim();
                position = parts[1].trim();
              }
            }
            
            // Если позиция все еще не определена, пытаемся извлечь из общего текста
            if (!position && teacherText.includes(',')) {
              const parts = teacherText.split(',');
              if (parts.length > 1 && parts[0].trim() === name) {
                position = parts[1].trim();
              }
            }
            
            // Очистка позиции
            if (position) {
              position = position.replace(/\s+/g, ' ').trim();
            }
            
            teachers.push({
              name: name,
              position: position,
              profileUrl: profileUrl,
              profileId: profileId
            });
          });
          
          // Семестр
          const semesterElement = card.querySelector('.float-end .mt-2');
          const semesterText = semesterElement?.textContent?.trim() || '';
          const semesterNumber = parseInt(semesterText.match(/\d+/)?.[0]) || null;
          
          // Тип контроля (сохраняем оригинальный текст)
          const controlTypeElement = card.querySelector('.flexRow-baseline span.text-center');
          const controlTypeText = controlTypeElement?.textContent?.trim() || '';
          
          // Оценка
          const markElement = card.querySelector('.flexRow-baseline span.text-warning, .flexRow-baseline span.text-success, .flexRow-baseline span.text-danger');
          const markText = markElement?.textContent?.trim() || 'нет';
          const markValue = parseMarkValue(markText);
          const markStatus = determineMarkStatus(markText, markValue);
          
          // Зачетные единицы (З.Е.)
          const creditsElement = card.querySelector('.text-success');
          const creditsText = creditsElement?.textContent?.trim() || '';
          const creditsValue = parseInt(creditsText) || null;
          
          const markData = {
            subject: {
              name: subjectName,
              url: subjectUrl,
              code: subjectCode
            },
            semester: {
              number: semesterNumber,
              text: semesterText
            },
            control: {
              type: null, // будет заполнено в сервисе
              typeText: controlTypeText, // оригинальный текст для расшифровки
              value: markValue,
              text: markText, // оригинальный текст оценки
              status: markStatus
            },
            credits: {
              value: creditsValue,
              text: creditsText
            },
            teachers: teachers
          };
          
          console.log(`Предмет ${index}:`, {
            subject: subjectName,
            controlType: controlTypeText,
            mark: markText,
            credits: creditsValue,
            teachers: teachers.map(t => ({ name: t.name, position: t.position }))
          });
          
          marks.push(markData);
          
        } catch (error) {
          console.error(`Ошибка парсинга карточки ${index}:`, error);
        }
      });
      
      // Вспомогательные функции для парсинга внутри evaluate
      function parseMarkValue(markText) {
        if (markText === 'нет' || markText === 'не зачтено') return null;
        const match = markText.match(/\d+/);
        return match ? parseInt(match[0]) : null;
      }
      
      function determineMarkStatus(markText, markValue) {
        if (markText.includes('зачет') || markText === 'зачтено') return 'зачет';
        if (markText.includes('незачет') || markText === 'не зачтено') return 'незачет';
        if (markValue !== null) return 'graded';
        return 'pending';
      }
      
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