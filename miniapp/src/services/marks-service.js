// services/marks-service.js
import { getAdminSupabase } from "../../lib/supabase-client";
import { CONTROL_TYPES, MARK_TYPES, MARK_COLORS } from "../constants/marks-constants";

export const marksService = {
  async saveUserMarks(userId, marks, requestedSemester = null, filters = {}) {
    try {

 const adminSupabase = getAdminSupabase();

      console.log('💾 Начинаем сохранение оценок для пользователя:', userId);
      console.log('📝 Количество оценок для сохранения:', marks.length);
      console.log('📅 Запрошенный семестр:', requestedSemester, typeof requestedSemester);
      console.log('🎛️  Фильтры:', filters);
      
      // Получаем информацию о пользователе для определения текущего семестра
      const userProfile = await this.getUserProfile(userId);
      const currentSemester = await this.calculateCurrentSemester(userProfile);
      
      console.log('🎯 Текущий семестр пользователя:', currentSemester, typeof currentSemester);
      
      // Нормализуем типы данных для сравнения
      const normalizedRequestedSemester = requestedSemester !== null ? 
        parseInt(requestedSemester) : null;
      const normalizedCurrentSemester = currentSemester !== null ? 
        parseInt(currentSemester) : null;
      
      console.log('🔍 Сравниваем семестры:', {
        requested: normalizedRequestedSemester,
        current: normalizedCurrentSemester
      });
      
      // Проверяем, нужно ли сохранять оценки (условие 1: семестр текущий)
      if (normalizedRequestedSemester !== null && normalizedRequestedSemester !== normalizedCurrentSemester) {
        console.log('⏩ Пропускаем сохранение: запрошенный семестр не является текущим');
        return {
          skipped: true,
          reason: 'not_current_semester',
          currentSemester: normalizedCurrentSemester,
          requestedSemester: normalizedRequestedSemester
        };
      }
      
      // Проверяем фильтры (условие 2: тип контроля "Все" и оценка "Все")
      const isAllControlTypes = filters.contrType === 0 || filters.contrType === '0';
      const isAllMarks = filters.mark === 0 || filters.mark === '0';
      
      console.log('🔍 Проверка фильтров:', {
        contrType: filters.contrType,
        mark: filters.mark,
        isAllControlTypes,
        isAllMarks
      });
      
      if (!isAllControlTypes || !isAllMarks) {
        console.log('⏩ Пропускаем сохранение: применены фильтры (не "Все" по типу контроля или оценке)');
        return {
          skipped: true,
          reason: 'filters_applied',
          currentSemester: normalizedCurrentSemester,
          filters: {
            contrType: filters.contrType,
            mark: filters.mark,
            isAllControlTypes,
            isAllMarks
          }
        };
      }
      
      console.log('✅ Все условия выполнены, сохраняем оценки в БД');
      
      // Обогащаем данные с расшифрованными константами
      const enrichedMarks = marks.map(mark => {
        // Расшифровываем тип контроля
        const controlTypeValue = this.getKeyByValue(CONTROL_TYPES, mark.control.typeText);
        const controlTypeText = CONTROL_TYPES[controlTypeValue] || mark.control.typeText;
        
        // Расшифровываем оценку
        const markValue = mark.control.value;
        const markText = this.getMarkText(markValue, mark.control.text);
        const markColor = MARK_COLORS[markText] || MARK_COLORS['нет'];
        
        // Валидация и очистка данных преподавателей
        const validatedTeachers = mark.teachers.map(teacher => 
          this.validateAndCleanTeacherData(teacher)
        );

        const enrichedMark = {
          subject: {
            name: mark.subject.name,
            url: mark.subject.url,
            code: mark.subject.code
          },
          semester: {
            number: mark.semester.number,
            text: mark.semester.text
          },
          control: {
            typeText: controlTypeText, // расшифрованный текст
            value: markValue,
            text: markText, // расшифрованный текст оценки
            status: mark.control.status,
          },
          credits: {
            value: mark.credits.value,
            text: mark.credits.text
          },
          teachers: validatedTeachers
        };
        
        console.log('📋 Обрабатываем предмет:', {
          subject: enrichedMark.subject.name,
          controlType: enrichedMark.control.typeText,
          mark: enrichedMark.control.text,
          credits: enrichedMark.credits.value
        });
        
        return enrichedMark;
      });
      
      const marksData = {
        marks: enrichedMarks,
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Проверяем существующую запись...');
      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, marks')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Ошибка при проверке существующей записи:', selectError);
        throw selectError;
      }

      console.log('📊 Существующая запись:', existingData ? 'найдена' : 'не найдена');

      let result;
      
      if (existingData) {
        console.log('🔄 Обновляем существующую запись (оценки)...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(marksData)
          .eq('user_id', userId)
          .select();

        if (error) {
          console.error('❌ Ошибка обновления оценок:', error);
          throw error;
        }
        result = data;
        console.log('✅ Оценки обновлены для пользователя', userId);
      } else {
        console.log('🆕 Создаем новую запись с оценками...');
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...marksData
          })
          .select();

        if (error) {
          console.error('❌ Ошибка создания записи с оценками:', error);
          throw error;
        }
        result = data;
        console.log('✅ Создана запись с оценками для пользователя', userId);
      }

      console.log('💾 Результат сохранения оценок:', result);
      return {
        ...result,
        currentSemester: normalizedCurrentSemester,
        saved: true
      };
      
    } catch (error) {
      console.error('❌ Ошибка сохранения оценок:', error);
      throw error;
    }
  },

  // Получение профиля пользователя
  async getUserProfile(userId) {
    try {

 const adminSupabase = getAdminSupabase();

      const { data, error } = await adminSupabase
        .from('user_data')
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Ошибка получения профиля пользователя:', error);
        throw error;
      }

      return data?.profile || null;
    } catch (error) {
      console.error('❌ Ошибка получения профиля:', error);
      throw error;
    }
  },

  // Расчет текущего семестра
  async calculateCurrentSemester(userProfile) {
    if (!userProfile || !userProfile.personal_info || !userProfile.personal_info.student_id) {
      console.error('❌ Не удалось получить student_id из профиля');
      return null;
    }

    const studentId = userProfile.personal_info.student_id;
    const admissionYear = parseInt(studentId.split('/')[0]);
    
    if (isNaN(admissionYear)) {
      console.error('❌ Неверный формат student_id:', studentId);
      return null;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Расчет разницы в годах
    const yearDifference = currentYear - admissionYear;
    
    // Расчет текущего семестра
    let currentSemester;
    
    if (yearDifference === 0) {
      // Первый год обучения
      if (currentMonth >= 9) {
        currentSemester = 1; // Осенний семестр первого года
      } else {
        currentSemester = 1; // До сентября все еще 1 семестр
      }
    } else if (yearDifference === 1) {
      // Второй год обучения
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = 2; // Весенний семестр
      } else if (currentMonth >= 9) {
        currentSemester = 3; // Осенний семестр второго года
      } else {
        currentSemester = 2; // Январь все еще 2 семестр
      }
    } else if (yearDifference === 2) {
      // Третий год обучения
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = 4; // Весенний семестр
      } else if (currentMonth >= 9) {
        currentSemester = 5; // Осенний семестр третьего года
      } else {
        currentSemester = 4; // Январь все еще 4 семестр
      }
    } else if (yearDifference === 3) {
      // Четвертый год обучения
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = 6; // Весенний семестр
      } else if (currentMonth >= 9) {
        currentSemester = 7; // Осенний семестр четвертого года
      } else {
        currentSemester = 6; // Январь все еще 6 семестр
      }
    } else {
      // Для более старших курсов продолжаем логику
      const baseSemester = (yearDifference - 1) * 2;
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = baseSemester + 2; // Весенний семестр
      } else {
        currentSemester = baseSemester + 1; // Осенний семестр
      }
    }

    console.log('📅 Расчет семестра:', {
      admissionYear,
      currentYear,
      currentMonth,
      yearDifference,
      currentSemester
    });

    return currentSemester;
  },

  // Вспомогательные методы
  getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  },

  getMarkText(markValue, originalText) {
    if (markValue === null) {
      return originalText === 'зачтено' ? 'зачет' : 
             originalText === 'не зачтено' ? 'незачет' : 'нет';
    }
    
    // Для числовых оценок
    const markMap = {
      2: 'неудовл.',
      3: 'удовл.',
      4: 'хорошо', 
      5: 'отлично'
    };
    
    return markMap[markValue] || originalText;
  },

  // Валидация и очистка данных преподавателей
  validateAndCleanTeacherData(teacher) {
    if (!teacher.name) return teacher;
    
    // Создаем копию объекта для избежания мутаций
    const cleanedTeacher = { ...teacher };
    
    // Очистка имени от лишних пробелов и переносов
    cleanedTeacher.name = cleanedTeacher.name.replace(/\s+/g, ' ').trim();
    
    // Извлечение должности из имени, если она там есть
    if (cleanedTeacher.name.includes('-')) {
      const parts = cleanedTeacher.name.split('-');
      if (parts.length > 1) {
        cleanedTeacher.name = parts[0].trim();
        // Если позиция еще не установлена, устанавливаем ее
        if (!cleanedTeacher.position) {
          cleanedTeacher.position = parts[1].trim();
        }
      }
    }
    
    // Если позиция не определена, но есть в тексте через запятую
    if (!cleanedTeacher.position && cleanedTeacher.name.includes(',')) {
      const parts = cleanedTeacher.name.split(',');
      if (parts.length > 1) {
        cleanedTeacher.name = parts[0].trim();
        cleanedTeacher.position = parts[1].trim();
      }
    }
    
    // Очистка позиции, если она есть
    if (cleanedTeacher.position) {
      cleanedTeacher.position = cleanedTeacher.position.replace(/\s+/g, ' ').trim();
    }
    
    return cleanedTeacher;
  },

  // Новый метод для получения оценок пользователя
  async getUserMarks(userId) {
    try {

 const adminSupabase = getAdminSupabase();
      
      const { data, error } = await adminSupabase
        .from('user_data')
        .select('marks, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Ошибка получения оценок:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Ошибка получения оценок пользователя:', error);
      throw error;
    }
  }
};