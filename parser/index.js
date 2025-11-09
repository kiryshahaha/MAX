import { GuapTasksScraper } from './scrapers/guap-tasks-scraper.js';
import { GuapReportsScraper } from './scrapers/guap-reports-scraper.js';
import { GuapProfileScraper } from './scrapers/guap-profile-scraper.js';
import { GuapScheduleScraper } from './scrapers/guap-schedule-scraper.js';
import { GuapMarksScraper } from './scrapers/guap-marks-scraper.js';
import { ErrorHandler } from './utils/error-handler.js';

export async function scrapeGuapTasks(credentials) {
  const scraper = new GuapTasksScraper();
  
  try {
    await scraper.validateCredentials(credentials);
    const result = await scraper.scrapeTasks(credentials);
    return result;
  } catch (error) {
    return ErrorHandler.handleScrapingError(error);
  }
}

export async function scrapeGuapReports(credentials) {
  const scraper = new GuapReportsScraper();
  
  try {
    await scraper.validateCredentials(credentials);
    const result = await scraper.scrapeReports(credentials);
    return result;
  } catch (error) {
    return ErrorHandler.handleScrapingError(error);
  }
}

export async function scrapeGuapProfile(credentials) {
  const scraper = new GuapProfileScraper();
  
  try {
    await scraper.validateCredentials(credentials);
    const result = await scraper.scrapeProfile(credentials);
    return result;
  } catch (error) {
    return ErrorHandler.handleScrapingError(error);
  }
}

export async function scrapeGuapSchedule(credentials, year = 2025, week = 44) {
  const scraper = new GuapScheduleScraper();
  
  try {
    await scraper.validateCredentials(credentials);
    const result = await scraper.scrapeSchedule(credentials, year, week);
    return result;
  } catch (error) {
    return ErrorHandler.handleScrapingError(error);
  }
}

export async function scrapeGuapMarks(credentials, semester = null, contrType = 0, teacher = 0, mark = 0) {
  const scraper = new GuapMarksScraper();
  
  try {
    await scraper.validateCredentials(credentials);
    const result = await scraper.scrapeMarks(credentials, semester, contrType, teacher, mark);
    return result;
  } catch (error) {
    return ErrorHandler.handleScrapingError(error);
  }
}