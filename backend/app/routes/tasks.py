from fastapi import APIRouter, HTTPException, Query, Depends
from db.dependencies import get_supabase_client

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/")
async def get_tasks(
    uid: str = Query(..., description="UID пользователя"),
    db = Depends(get_supabase_client)
):
    """Получение задач пользователя по UID"""
    tasks = db.get_tasks_by_uid(uid)
    
    return {
        "success": True,
        "tasks": tasks,
        "tasks_count": len(tasks),
        "uid": uid
    }