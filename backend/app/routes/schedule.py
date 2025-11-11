from fastapi import APIRouter, HTTPException, Query, Depends
from db.dependencies import get_supabase_client

router = APIRouter(prefix="/schedule", tags=["Schedule"])

@router.get("/")
async def get_schedule(
    uid: str = Query(..., description="UID пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение расписания на сегодня, вчера и завтра"""
    try:
        today_schedule = db.get_today_schedule_by_uid(uid)
        tomorrow_schedule = db.get_tomorrow_schedule_by_uid(uid)
        yesterday_schedule = db.get_yesterday_schedule_by_uid(uid)
        
        return {
            "success": True,
            "uid": uid,
            "today": today_schedule,
            "tomorrow": tomorrow_schedule,
            "yesterday": yesterday_schedule
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting schedule: {str(e)}")

@router.get("/week")
async def get_weekly_schedule(
    uid: str = Query(..., description="UID пользователя"),
    week: int = Query(None, description="Номер недели (опционально)"),
    db = Depends(get_supabase_client)
):
    """Получение недельного расписания"""
    try:
        weekly_schedule = db.get_schedule_week_by_uid(uid, week)
        
        return {
            "success": True,
            "uid": uid,
            "week": week,
            "schedule": weekly_schedule
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting weekly schedule: {str(e)}")

@router.get("/today")
async def get_today_schedule(
    uid: str = Query(..., description="UID пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение расписания только на сегодня"""
    try:
        today_schedule = db.get_today_schedule_by_uid(uid)
        
        return {
            "success": True,
            "uid": uid,
            "schedule": today_schedule
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting today's schedule: {str(e)}")

@router.get("/tomorrow")
async def get_tomorrow_schedule(
    uid: str = Query(..., description="UID пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение расписания только на завтра"""
    try:
        tomorrow_schedule = db.get_tomorrow_schedule_by_uid(uid)
        
        return {
            "success": True,
            "uid": uid,
            "schedule": tomorrow_schedule
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting tomorrow's schedule: {str(e)}")

@router.get("/yesterday")
async def get_yesterday_schedule(
    uid: str = Query(..., description="UID пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение расписания только на вчера"""
    try:
        yesterday_schedule = db.get_yesterday_schedule_by_uid(uid)
        
        return {
            "success": True,
            "uid": uid,
            "schedule": yesterday_schedule
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting yesterday's schedule: {str(e)}")