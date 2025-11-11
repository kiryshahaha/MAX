from fastapi import APIRouter, HTTPException, Query, Depends
from db.dependencies import get_supabase_client

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/")
async def get_reports(
    uid: str = Query(..., description="Email пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение отчеты пользователя по email"""
    reports = db.get_reports_by_uid(uid) or []  # Если None, возвращаем пустой список
    
    return {
        "success": True,
        "reports": reports,
        "reports_count": len(reports),
        "user_id": uid
    }