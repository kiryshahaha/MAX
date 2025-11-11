from datetime import datetime, time, timedelta
from repository import insert_appointment, get_appointments_by_psychologist, get_appointments_by_user

psychologists_schedule = {
    "Клепов Дмитрий Олегович": {
        "Tuesday": [(time(16, 0), time(20, 0))],
        "Thursday": [(time(16, 0), time(20, 0))],
        "Saturday": [(time(11, 0), time(16, 0))]
    },
    "Кашкина Лариса Владимировна": {
        "Monday": [(time(10, 0), time(14, 0))],
        "Wednesday": [(time(10, 0), time(14, 0))],
        "Friday": [(time(10, 0), time(14, 0))]
    }
}

async def get_available_slots(psychologist_name: str, date: datetime):
    """
    Возвращает список доступных часов для записи на конкретного психолога в конкретный день.
    """
    weekday = date.strftime("%A")
    schedule = psychologists_schedule.get(psychologist_name)
    if not schedule or weekday not in schedule:
        return []  # психолог не работает в этот день

    # Получаем все записи психолога на этот день
    existing_appointments = await get_appointments_by_psychologist(psychologist_name)
    occupied_hours = set()
    for appt in existing_appointments:
        appt_time = datetime.fromisoformat(appt["appointment_time"])
        if appt_time.date() == date.date():
            occupied_hours.add(appt_time.hour)

    available_slots = []
    for start, end in schedule[weekday]:
        for hour in range(start.hour, end.hour):
            if hour not in occupied_hours:
                slot = datetime.combine(date.date(), time(hour, 0))
                available_slots.append(slot.isoformat())

    return available_slots

async def get_schedule_for_psychologist(psychologist_name: str, date: datetime):
    """
    Возвращает расписание психолога на день с отметкой, занято или свободно
    """
    weekday = date.strftime("%A")
    schedule = psychologists_schedule.get(psychologist_name)
    if not schedule or weekday not in schedule:
        return []

    existing_appointments = await get_appointments_by_psychologist(psychologist_name)
    occupied_hours = set()
    for appt in existing_appointments:
        appt_time = datetime.fromisoformat(appt["appointment_time"])
        if appt_time.date() == date.date():
            occupied_hours.add(appt_time.hour)

    slots = []
    for start, end in schedule[weekday]:
        for hour in range(start.hour, end.hour):
            slots.append({
                "time": datetime.combine(date.date(), time(hour, 0)).isoformat(),
                "occupied": hour in occupied_hours
            })
    return slots


def validate_schedule(psychologist_name: str, appointment_time: datetime, existing_appointments: list):
    weekday = appointment_time.strftime("%A")
    schedule = psychologists_schedule.get(psychologist_name)
    if not schedule or weekday not in schedule:
        raise ValueError(f"{psychologist_name} не работает в {weekday}")

    hour = appointment_time.time()
    allowed = False
    for start, end in schedule[weekday]:
        if start <= hour < end:
            allowed = True
            break
    if not allowed:
        raise ValueError(f"{psychologist_name} работает только в отрезках {schedule[weekday]}")

    for appt in existing_appointments:
        if datetime.fromisoformat(appt["appointment_time"]) == appointment_time:
            raise ValueError("Данное время уже занято")

async def create_appointment(data: dict):
    # Проверка времени и расписания
    existing = await get_appointments_by_psychologist(data["psychologist_name"])
    appointment_time = data["appointment_time"]
    if isinstance(appointment_time, str):
        appointment_time = datetime.fromisoformat(appointment_time)
    validate_schedule(data["psychologist_name"], appointment_time, existing)

    # Конвертируем datetime в ISO, чтобы Supabase принял
    data["appointment_time"] = appointment_time.isoformat()

    return await insert_appointment(data)

async def get_user_appointments(user_id: str):
    return await get_appointments_by_user(user_id)
