from fastapi import APIRouter, Query

router = APIRouter(prefix="/schedule", tags=["Schedule"]) 

@router.get("/")
async def get_schedule(week:int = Query(None), group = Query(None)):
    # получить расписание (через scraping_service или БД)
    return {"schedule": [], "params": {"week": week, "group": group}}

@router.get("/today")
async def get_today_schedule():
    # получить расписание на сегодня
    return {"schedule": "Today's schedule (stub)"}

@router.post("/refresh")
async def refresh_schedule():
    # триггер обновления расписания через парсер
    return {"message": "Schedule refresh started (stub)"}



