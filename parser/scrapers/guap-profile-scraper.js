// parser/scrapers/guap-profile-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapProfileScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

   async scrapeProfile(credentials) {
  let page;
  let sessionInvalidated = false;
  
  try {
    await this.validateCredentials(credentials);
    page = await this.getAuthenticatedPage(credentials);

    // Переход к профилю с улучшенной обработкой ошибок
    await this.navigateToProfile(page);
    
    // Парсинг данных профиля
    const profileData = await this.parseProfile(page);
    
    return {
      success: true,
      message: `✅ Профиль успешно получен!`,
      profile: profileData
    };

  } catch (error) {
    console.error('❌ Ошибка при скрапинге профиля:', error);
    
    // Инвалидируем сессию только при определенных ошибках
    if (page && !sessionInvalidated && 
        (error.message.includes('detached') || 
         error.message.includes('closed') ||
         error.message.includes('ERR_ABORTED'))) {
      sessionInvalidated = true;
      await this.invalidateSession(credentials);
    }
    
    throw error;
  }
}

async navigateToProfile(page) {
  console.log('Переходим на страницу профиля...');
  
  try {
    await page.goto('https://pro.guap.ru/inside/profile', { 
      waitUntil: 'domcontentloaded', // ИЗМЕНИТЬ waitUntil
      timeout: 20000 
    });
    
    // Ждем загрузки основных элементов профиля
    await page.waitForFunction(() => {
      const profileCards = document.querySelectorAll('.card');
      return profileCards.length > 0;
    }, { timeout: 10000 });
    
  } catch (error) {
    console.error('❌ Ошибка навигации к профилю:', error);
    
    // Проверяем текущее состояние страницы
    try {
      const currentUrl = page.url();
      console.log('Текущий URL после ошибки:', currentUrl);
    } catch (e) {
      console.log('Не удалось получить URL страницы');
    }
    
    throw error;
  }
}

  async parseProfile(page) {
    return await page.evaluate(() => {
      const profile = {
        personal_info: {},
        academic_info: {},
        program_info: {
          specialty: {}
        },
        contacts: {},
        academic_context: {
          available_cabinets: []
        }
      };

      // Основная информация из первой карточки
      const mainCard = document.querySelector('.card.shadow-sm');
      if (mainCard) {
        // Фотография профиля
        const profileImage = mainCard.querySelector('.profile_image');
        if (profileImage) {
          profile.personal_info.photo_url = profileImage.src;
        }

        // ФИО
        const nameElement = mainCard.querySelector('h3.text-center');
        if (nameElement) {
          profile.personal_info.full_name = nameElement.textContent.trim();
        }

        // Информация из списка
        const listItems = mainCard.querySelectorAll('.list-group-item');
        listItems.forEach(item => {
          const heading = item.querySelector('h5');
          if (heading) {
            const headingText = heading.textContent.trim();
            const valueElement = heading.querySelector('span.fw-light');
            const value = valueElement ? valueElement.textContent.trim() : '';

            if (headingText.includes('Институт/факультет')) {
              profile.program_info.institute = value;
            } else if (headingText.includes('Группа')) {
              profile.academic_info.group = value;
            } else if (headingText.includes('Номер студенческого билета') || headingText.includes('зачетной книжки')) {
              profile.personal_info.student_id = value;
            } else if (headingText.includes('Специальность')) {
              profile.program_info.specialty.full_name = value;
              // Извлекаем чистую специальность без кода
              const cleanSpecialty = value.replace(/\d{2}\.\d{2}\.\d{2}\s*/, '').trim();
              profile.program_info.specialty.name = cleanSpecialty;
              
              // Код специальности
              const codeMatch = value.match(/\d{2}\.\d{2}\.\d{2}/);
              if (codeMatch) {
                profile.program_info.specialty.code = codeMatch[0];
              }
            } else if (headingText.includes('Направленность')) {
              profile.program_info.direction = value;
            } else if (headingText.includes('Форма обучения')) {
              profile.academic_info.education_form = value;
            } else if (headingText.includes('Уровень профессионального образования')) {
              profile.academic_info.education_level = value;
            } else if (headingText.includes('Статус')) {
              profile.academic_info.status = value;
            } else if (headingText.includes('Приказ о зачислении')) {
              profile.academic_info.enrollment_order = value;
            }
          }
        });
      }

      // Контактная информация из второй карточки
      const contactsCard = document.querySelectorAll('.card.shadow-sm')[1];
      if (contactsCard) {
        const contactItems = contactsCard.querySelectorAll('.list-group-item');
        contactItems.forEach(item => {
          const heading = item.querySelector('h5');
          if (heading) {
            const headingText = heading.textContent.trim();
            const valueElement = item.querySelector('.small');
            const value = valueElement ? valueElement.textContent.trim() : '';

            if (headingText.includes('Email')) {
              profile.contacts.primary_email = value;
            } else if (headingText.includes('Почта аккаунта')) {
              profile.contacts.secondary_email = value;
            } else if (headingText.includes('Телефон')) {
              profile.contacts.phone = value;
            }
          }
        });
      }

      // Информация о личных кабинетах из третьей карточки
      const cabinetCard = document.querySelectorAll('.card.shadow-sm')[2];
      if (cabinetCard) {
        const selectElement = cabinetCard.querySelector('select[name="eid"]');
        if (selectElement) {
          const options = selectElement.querySelectorAll('option');
          options.forEach(option => {
            if (option.value && option.textContent) {
              const cabinet = {
                id: option.value,
                name: option.textContent.trim(),
                is_selected: option.selected
              };
              
              profile.academic_context.available_cabinets.push(cabinet);
              
              // Устанавливаем текущий кабинет если он выбран
              if (option.selected) {
                profile.academic_context.current_cabinet = cabinet;
              }
            }
          });
        }
      }

      return profile;
    });
  }
}