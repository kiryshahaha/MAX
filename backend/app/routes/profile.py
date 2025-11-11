from fastapi import APIRouter, HTTPException, Query, Depends
from db.dependencies import get_supabase_client

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/")
async def get_profile(
    uid: str = Query(..., description="UID пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение профиля пользователя по UID"""
    profile = db.get_profile_by_uid(uid)
    
    return {
        "success": True,
        "profile": profile,
        "uid": uid
    }