import os
from supabase import create_client, Client
from datetime import datetime, timedelta

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.key:
            raise ValueError(f"Supabase credentials not found. URL: {self.url}, Key: {self.key}")
        
        self.client: Client = create_client(self.url, self.key)
        print("✅ Supabase client initialized successfully")

    def get_user_by_uid(self, uid: str):
        """Получаем пользователя из Authentication.users по UID"""
        try:
            response = self.client.table("users").select("*").eq("UID", uid).execute()
            
            if response.data:
                print(f"✅ Found user with UID: {uid}")
                return response.data[0]
            else:
                print(f"❌ No user found with UID: {uid}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting user by UID: {e}")
            return None

    def get_user_data_by_uid(self, uid: str):
        """Получаем данные пользователя из user_data по UID"""
        try:
            response = self.client.table("user_data")\
                .select("*")\
                .eq("user_id", uid)\
                .execute()
            
            if response.data:
                print(f"✅ Found user data for UID: {uid}")
                return response.data[0]
            else:
                print(f"❌ No user data found for UID: {uid}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting user data by UID: {e}")
            return None

    def get_schedule_by_uid(self, uid: str):
        """Получаем расписание пользователя по UID из поля week_schedule"""
        user_data = self.get_user_data_by_uid(uid)
        if user_data and 'week_schedule' in user_data:
            schedule = user_data['week_schedule']
            
            if isinstance(schedule, dict) and 'days' in schedule:
                print(f"✅ Found week_schedule with {len(schedule['days'])} days for UID: {uid}")
                return schedule
            elif schedule is None:
                schedule = {}
            else:
                print(f"✅ Found week_schedule as {type(schedule).__name__} for UID: {uid}")
            
            return schedule
        print(f"❌ No week_schedule found for UID: {uid}")
        return {}

    def get_today_schedule_by_uid(self, uid: str):
        """Получаем расписание на сегодня из week_schedule"""
        schedule = self.get_schedule_by_uid(uid)
        return self._extract_day_schedule(schedule, 0)  # Сегодня

    def get_tomorrow_schedule_by_uid(self, uid: str):
        """Получаем расписание на завтра из week_schedule"""
        schedule = self.get_schedule_by_uid(uid)
        return self._extract_day_schedule(schedule, 1)  # Завтра

    def get_yesterday_schedule_by_uid(self, uid: str):
        """Получаем расписание на вчера из week_schedule"""
        schedule = self.get_schedule_by_uid(uid)
        return self._extract_day_schedule(schedule, -1)  # Вчера

    def _extract_day_schedule(self, schedule, day_offset: int):
        """Извлекаем расписание для конкретного дня из week_schedule по полю date"""
        # Определяем целевую дату
        target_date = datetime.now() + timedelta(days=day_offset)
        
        # Форматируем дату в формате "день.месяц" (например: "10.11")
        target_date_str = target_date.strftime("%d.%m")
        
        # Русские названия дней недели
        day_names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        day_name = day_names[target_date.weekday()]
        
        # Базовый результат
        result = {
            "date": target_date.strftime("%Y-%m-%d"),
            "date_dd_mm": target_date_str,
            "day_name": day_name,
            "day_of_week": target_date.weekday(),
            "schedule": []
        }
        
        if not schedule or not isinstance(schedule, dict) or 'days' not in schedule:
            return result
        
        days_list = schedule.get('days', [])
        
        # Ищем день с нужной датой
        for day_data in days_list:
            if isinstance(day_data, dict) and day_data.get('date') == target_date_str:
                # Нашли нужный день!
                classes = day_data.get('classes', [])
                
                # Форматируем занятия для единообразия
                formatted_classes = []
                for class_item in classes:
                    if isinstance(class_item, dict):
                        formatted_class = {
                            "type": class_item.get('type', ''),
                            "group": class_item.get('group', ''),
                            "subject": class_item.get('subject', ''),
                            "teacher": class_item.get('teacher', ''),
                            "building": class_item.get('building', ''),
                            "location": class_item.get('location', ''),
                            "timeRange": class_item.get('timeRange', ''),
                            "pairNumber": class_item.get('pairNumber', ''),
                            "teacherInfo": class_item.get('teacherInfo', '')
                        }
                        formatted_classes.append(formatted_class)
                
                result["schedule"] = formatted_classes
                result["order"] = day_data.get('order')
                result["fullDate"] = day_data.get('fullDate')
                print(f"✅ Found {len(formatted_classes)} classes for date {target_date_str}")
                return result
        
        print(f"❌ No schedule found for date {target_date_str}")
        return result

    def get_schedule_week_by_uid(self, uid: str, week: int = None):
        """Получаем недельное расписание пользователя из week_schedule"""
        schedule = self.get_schedule_by_uid(uid)
        
        if not schedule or not isinstance(schedule, dict):
            return {}
        
        # Возвращаем всю структуру week_schedule
        return {
            "success": True,
            "week": week,
            "schedule": schedule,
            "total_days": len(schedule.get('days', [])),
            "total_extra_classes": len(schedule.get('extraClasses', []))
        }

    def get_extra_classes_by_uid(self, uid: str):
        """Получаем дополнительные занятия из week_schedule"""
        schedule = self.get_schedule_by_uid(uid)
        
        if not schedule or not isinstance(schedule, dict):
            return []
        
        extra_classes = schedule.get('extraClasses', [])
        
        # Форматируем дополнительные занятия
        formatted_extra_classes = []
        for class_item in extra_classes:
            if isinstance(class_item, dict):
                formatted_class = {
                    "type": class_item.get('type', ''),
                    "group": class_item.get('group', ''),
                    "subject": class_item.get('subject', ''),
                    "teacher": class_item.get('teacher', ''),
                    "building": class_item.get('building', ''),
                    "location": class_item.get('location', ''),
                    "teacherInfo": class_item.get('teacherInfo', '')
                }
                formatted_extra_classes.append(formatted_class)
        
        print(f"✅ Found {len(formatted_extra_classes)} extra classes for UID: {uid}")
        return formatted_extra_classes

    def get_tasks_by_uid(self, uid: str):
        """Получаем задачи пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if user_data and 'tasks' in user_data:
            tasks = user_data['tasks']
            if tasks is None:
                tasks = []
            elif not isinstance(tasks, list):
                tasks = [tasks]
            print(f"✅ Found {len(tasks)} tasks for UID: {uid}")
            return tasks
        print(f"❌ No tasks found for UID: {uid}")
        return []

    def get_profile_by_uid(self, uid: str):
        """Получаем профиль пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if user_data:
            profile = user_data.get('profile', {})
            if profile is None:
                profile = {}
            print(f"✅ Found profile for UID: {uid}")
            return profile
        print(f"❌ No profile found for UID: {uid}")
        return {}

    def get_marks_by_uid(self, uid: str):
        """Получаем оценки пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if user_data and 'marks' in user_data:
            marks = user_data['marks']
            if marks is None:
                marks = []
            elif not isinstance(marks, list):
                marks = [marks]
            print(f"✅ Found {len(marks)} marks for UID: {uid}")
            return marks
        print(f"❌ No marks found for UID: {uid}")
        return []

    def get_reports_by_uid(self, uid: str):
        """Получаем отчеты пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if user_data and 'reports' in user_data:
            reports = user_data['reports']
            if reports is None:
                reports = []
            elif not isinstance(reports, list):
                reports = [reports]
            print(f"✅ Found {len(reports)} reports for UID: {uid}")
            return reports
        print(f"❌ No reports found for UID: {uid}")
        return []

    def get_materials_by_uid(self, uid: str):
        """Получаем материалы пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if user_data and 'materials' in user_data:
            materials = user_data['materials']
            if materials is None:
                materials = []
            elif not isinstance(materials, list):
                materials = [materials]
            print(f"✅ Found {len(materials)} materials for UID: {uid}")
            return materials
        print(f"❌ No materials found for UID: {uid}")
        return []

    def get_all_user_data_by_uid(self, uid: str):
        """Получаем все данные пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if not user_data:
            return {}
        
        # Собираем все данные в одну структуру
        comprehensive_data = {
            "uid": uid,
            "profile": self.get_profile_by_uid(uid),
            "tasks": self.get_tasks_by_uid(uid),
            "schedule": self.get_schedule_by_uid(uid),
            "marks": self.get_marks_by_uid(uid),
            "reports": self.get_reports_by_uid(uid),
            "materials": self.get_materials_by_uid(uid),
            "extra_classes": self.get_extra_classes_by_uid(uid),
            "today_schedule": self.get_today_schedule_by_uid(uid),
            "tomorrow_schedule": self.get_tomorrow_schedule_by_uid(uid),
            "yesterday_schedule": self.get_yesterday_schedule_by_uid(uid)
        }
        
        return comprehensive_data

    def get_user_stats_by_uid(self, uid: str):
        """Получаем статистику пользователя по UID"""
        user_data = self.get_user_data_by_uid(uid)
        if not user_data:
            return {}
        
        schedule = self.get_schedule_by_uid(uid)
        days_count = len(schedule.get('days', [])) if isinstance(schedule, dict) else 0
        
        return {
            "uid": uid,
            "tasks_count": len(self.get_tasks_by_uid(uid)),
            "reports_count": len(self.get_reports_by_uid(uid)),
            "marks_count": len(self.get_marks_by_uid(uid)),
            "materials_count": len(self.get_materials_by_uid(uid)),
            "schedule_days_count": days_count,
            "extra_classes_count": len(self.get_extra_classes_by_uid(uid)),
            "has_profile": bool(self.get_profile_by_uid(uid)),
            "last_updated": user_data.get('updated_at')
        }

# Создаем глобальный экземпляр клиента
supabase_client = SupabaseClient()