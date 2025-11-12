// utils/taskUtils.js

/**
 * Извлекает ID задачи из ссылки GUAP
 */
export const extractTaskIdFromLink = (link) => {
  if (!link) return null;
  try {
    const url = new URL(link);
    const pathParts = url.pathname.split('/').filter(part => part);
    const taskIndex = pathParts.indexOf('tasks');
    
    if (taskIndex !== -1 && taskIndex + 1 < pathParts.length) {
      return pathParts[taskIndex + 1];
    }
    
    // Если не нашли через 'tasks', берем последнюю часть
    return pathParts[pathParts.length - 1] || null;
  } catch (error) {
    console.error('Error extracting task ID from link:', error);
    return null;
  }
};

/**
 * Проверяет статус отчета
 */
export const getReportStatusInfo = (report) => {
  const status = report.status?.toLowerCase();
  
  return {
    isAccepted: status === 'принят' || status === 'принято' || status === 'accepted',
    isRejected: status === 'не принят' || status === 'отклонен' || status === 'rejected',
    isPending: status === 'ожидает проверки' || status === 'на проверке' || status === 'pending',
    originalStatus: report.status
  };
};

/**
 * Нормализует название для сравнения
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Сравнивает названия задач с учетом возможных различий
 */
export const areTaskNamesSimilar = (name1, name2) => {
  const normalized1 = normalizeText(name1);
  const normalized2 = normalizeText(name2);
  
  if (normalized1 === normalized2) return true;
  
  // Проверяем частичное вхождение
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Сравниваем первые несколько слов
  const words1 = normalized1.split(' ').slice(0, 3);
  const words2 = normalized2.split(' ').slice(0, 3);
  
  return words1.some(word => words2.includes(word)) || 
         words2.some(word => words1.includes(word));
};