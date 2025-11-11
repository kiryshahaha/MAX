from fastapi import APIRouter, HTTPException, Query, Depends
from db.dependencies import get_supabase_client

router = APIRouter(prefix="/marks", tags=["Marks"])

@router.get("/")
async def get_marks(
    uid: str = Query(..., description="Email пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение оценок пользователя по email"""
    marks = db.get_marks_by_uid(uid) or []  # Если None, возвращаем пустой список
    
    return {
        "success": True,
        "marks": marks,
        "marks_count": len(marks),
        "user_id": uid
    }