from fastapi import Depends, HTTPException, Query
from .supabase_client import supabase_client

def get_supabase_client():
    """Dependency для получения клиента Supabase"""
    return supabase_client

async def get_current_user_data(
    uid: str = Query(..., description="UID пользователя из Authentication"),
    db = Depends(get_supabase_client)
):
    """Dependency для получения данных текущего пользователя по UID"""
    if not uid:
        raise HTTPException(status_code=400, detail="UID is required")
    
    # Проверяем, что пользователь существует в Authentication
    user = db.get_user_by_uid(uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in Authentication")
    
    return {"uid": uid, "user": user}