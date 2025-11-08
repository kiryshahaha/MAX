// parser/scrapers/guap-profile-scraper.js
import { BaseScraper } from './base-scraper.js';
import { GuapAuthStrategy } from '../auth/strategies/guap-auth.js';

export class GuapProfileScraper extends BaseScraper {
  constructor() {
    super();
    this.authStrategy = GuapAuthStrategy;
  }

  async scrapeProfile(credentials) {
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

      // Переход к профилю
      await this.navigateToProfile(page);
      
      // Парсинг данных профиля
      const profileData = await this.parseProfile(page);
      
      return {
        success: true,
        message: `✅ Профиль успешно получен!`,
        profile: profileData
      };

    } catch (error) {
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async navigateToProfile(page) {
    console.log('Переходим на страницу профиля...');
    await page.goto('https://pro.guap.ru/inside/profile', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Ждем загрузки основных элементов профиля
    await page.waitForFunction(() => {
      const profileCards = document.querySelectorAll('.card');
      return profileCards.length > 0;
    }, { timeout: 10000 });
  }

  async parseProfile(page) {
    return await page.evaluate(() => {
      const profile = {};

      // Основная информация из первой карточки
      const mainCard = document.querySelector('.card.shadow-sm');
      if (mainCard) {
        // Фотография профиля
        const profileImage = mainCard.querySelector('.profile_image');
        if (profileImage) {
          profile.photoUrl = profileImage.src;
        }

        // ФИО
        const nameElement = mainCard.querySelector('h3.text-center');
        if (nameElement) {
          profile.fullName = nameElement.textContent.trim();
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
              profile.institute = value;
            } else if (headingText.includes('Группа')) {
              profile.group = value;
            } else if (headingText.includes('Номер студенческого билета') || headingText.includes('зачетной книжки')) {
              profile.studentId = value;
            } else if (headingText.includes('Специальность')) {
              profile.specialty = value;
              // Извлекаем чистую специальность без кода
              const cleanSpecialty = value.replace(/\d{2}\.\d{2}\.\d{2}\s*/, '').trim();
              profile.cleanSpecialty = cleanSpecialty;
              
              // Код специальности
              const codeMatch = value.match(/\d{2}\.\d{2}\.\d{2}/);
              if (codeMatch) {
                profile.specialtyCode = codeMatch[0];
              }
            } else if (headingText.includes('Направленность')) {
              profile.direction = value;
            } else if (headingText.includes('Форма обучения')) {
              profile.educationForm = value;
            } else if (headingText.includes('Уровень профессионального образования')) {
              profile.educationLevel = value;
            } else if (headingText.includes('Статус')) {
              profile.status = value;
            } else if (headingText.includes('Приказ о зачислении')) {
              profile.enrollmentOrder = value;
            }
          }
        });
      }

      // Контактная информация из второй карточки
      const contactsCard = document.querySelectorAll('.card.shadow-sm')[1];
      if (contactsCard) {
        profile.contacts = {};
        
        const contactItems = contactsCard.querySelectorAll('.list-group-item');
        contactItems.forEach(item => {
          const heading = item.querySelector('h5');
          if (heading) {
            const headingText = heading.textContent.trim();
            const valueElement = item.querySelector('.small');
            const value = valueElement ? valueElement.textContent.trim() : '';

            if (headingText.includes('Email')) {
              profile.contacts.email = value;
            } else if (headingText.includes('Почта аккаунта')) {
              profile.contacts.accountEmail = value;
            } else if (headingText.includes('Телефон')) {
              profile.contacts.phone = value;
            }
          }
        });
      }

      // Информация о личных кабинетах из третьей карточки
      const cabinetCard = document.querySelectorAll('.card.shadow-sm')[2];
      if (cabinetCard) {
        profile.availableCabinets = [];
        
        const selectElement = cabinetCard.querySelector('select[name="eid"]');
        if (selectElement) {
          const options = selectElement.querySelectorAll('option');
          options.forEach(option => {
            if (option.value && option.textContent) {
              profile.availableCabinets.push({
                value: option.value,
                label: option.textContent.trim(),
                selected: option.selected
              });
            }
          });
        }

        // Текущий выбранный кабинет
        profile.currentCabinet = profile.availableCabinets.find(cab => cab.selected);
      }

      // Дополнительная информация
      profile.scrapedAt = new Date().toISOString();

      return profile;
    });
  }
}