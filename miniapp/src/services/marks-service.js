import { getAdminSupabase } from "../../lib/supabase-client";
import { CONTROL_TYPES, MARK_TYPES, MARK_COLORS } from "../constants/marks-constants";

export const marksService = {
  async saveUserMarks(userId, marks, requestedSemester = null, filters = {}) {
    try {

 const adminSupabase = getAdminSupabase();

      const userProfile = await this.getUserProfile(userId);
      const currentSemester = await this.calculateCurrentSemester(userProfile);
      
      
      const normalizedRequestedSemester = requestedSemester !== null ? 
        parseInt(requestedSemester) : null;
      const normalizedCurrentSemester = currentSemester !== null ? 
        parseInt(currentSemester) : null;
      
      
      if (normalizedRequestedSemester !== null && normalizedRequestedSemester !== normalizedCurrentSemester) {
        return {
          skipped: true,
          reason: 'not_current_semester',
          currentSemester: normalizedCurrentSemester,
          requestedSemester: normalizedRequestedSemester
        };
      }
      
      const isAllControlTypes = filters.contrType === 0 || filters.contrType === '0';
      const isAllMarks = filters.mark === 0 || filters.mark === '0';
      
      
      if (!isAllControlTypes || !isAllMarks) {
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
      
      const enrichedMarks = marks.map(mark => {
        const controlTypeValue = this.getKeyByValue(CONTROL_TYPES, mark.control.typeText);
        const controlTypeText = CONTROL_TYPES[controlTypeValue] || mark.control.typeText;
        
        const markValue = mark.control.value;
        const markText = this.getMarkText(markValue, mark.control.text);
        const markColor = MARK_COLORS[markText] || MARK_COLORS['нет'];
        
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
            typeText: controlTypeText, 
            value: markValue,
            text: markText, 
            status: mark.control.status,
          },
          credits: {
            value: mark.credits.value,
            text: mark.credits.text
          },
          teachers: validatedTeachers
        };
        
        
        return enrichedMark;
      });
      
      const marksData = {
        marks: enrichedMarks,
        updated_at: new Date().toISOString()
      };

      const { data: existingData, error: selectError } = await adminSupabase
        .from('user_data')
        .select('id, marks')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }


      let result;
      
      if (existingData) {
        const { data, error } = await adminSupabase
          .from('user_data')
          .update(marksData)
          .eq('user_id', userId)
          .select();

        if (error) {
          throw error;
        }
        result = data;
      } else {
        const { data, error } = await adminSupabase
          .from('user_data')
          .insert({
            user_id: userId,
            ...marksData
          })
          .select();

        if (error) {
          throw error;
        }
        result = data;
      }

      return {
        ...result,
        currentSemester: normalizedCurrentSemester,
        saved: true
      };
      
    } catch (error) {
      throw error;
    }
  },

  async getUserProfile(userId) {
    try {

 const adminSupabase = getAdminSupabase();

      const { data, error } = await adminSupabase
        .from('user_data')
        .select('profile')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data?.profile || null;
    } catch (error) {
      throw error;
    }
  },

  async calculateCurrentSemester(userProfile) {
    if (!userProfile || !userProfile.personal_info || !userProfile.personal_info.student_id) {
      return null;
    }

    const studentId = userProfile.personal_info.student_id;
    const admissionYear = parseInt(studentId.split('/')[0]);
    
    if (isNaN(admissionYear)) {
      return null;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; 
    
    const yearDifference = currentYear - admissionYear;
    
    let currentSemester;
    
    if (yearDifference === 0) {
      if (currentMonth >= 9) {
        currentSemester = 1; 
      } else {
        currentSemester = 1; 
      }
    } else if (yearDifference === 1) {
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = 2; 
      } else if (currentMonth >= 9) {
        currentSemester = 3; 
      } else {
        currentSemester = 2; 
      }
    } else if (yearDifference === 2) {
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = 4; 
      } else if (currentMonth >= 9) {
        currentSemester = 5; 
      } else {
        currentSemester = 4;
      }
    } else if (yearDifference === 3) {
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = 6;
      } else if (currentMonth >= 9) {
        currentSemester = 7; 
      } else {
        currentSemester = 6; 
      }
    } else {
      const baseSemester = (yearDifference - 1) * 2;
      if (currentMonth >= 2 && currentMonth <= 8) {
        currentSemester = baseSemester + 2; 
      } else {
        currentSemester = baseSemester + 1; 
      }
    }


    return currentSemester;
  },

  getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  },

  getMarkText(markValue, originalText) {
    if (markValue === null) {
      return originalText === 'зачтено' ? 'зачет' : 
             originalText === 'не зачтено' ? 'незачет' : 'нет';
    }
    
    const markMap = {
      2: 'неудовл.',
      3: 'удовл.',
      4: 'хорошо', 
      5: 'отлично'
    };
    
    return markMap[markValue] || originalText;
  },

  validateAndCleanTeacherData(teacher) {
    if (!teacher.name) return teacher;
    
    const cleanedTeacher = { ...teacher };
    
    cleanedTeacher.name = cleanedTeacher.name.replace(/\s+/g, ' ').trim();
    
    if (cleanedTeacher.name.includes('-')) {
      const parts = cleanedTeacher.name.split('-');
      if (parts.length > 1) {
        cleanedTeacher.name = parts[0].trim();
        if (!cleanedTeacher.position) {
          cleanedTeacher.position = parts[1].trim();
        }
      }
    }
    
    if (!cleanedTeacher.position && cleanedTeacher.name.includes(',')) {
      const parts = cleanedTeacher.name.split(',');
      if (parts.length > 1) {
        cleanedTeacher.name = parts[0].trim();
        cleanedTeacher.position = parts[1].trim();
      }
    }
    
    if (cleanedTeacher.position) {
      cleanedTeacher.position = cleanedTeacher.position.replace(/\s+/g, ' ').trim();
    }
    
    return cleanedTeacher;
  },

  async getUserMarks(userId) {
    try {

 const adminSupabase = getAdminSupabase();
      
      const { data, error } = await adminSupabase
        .from('user_data')
        .select('marks, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
};