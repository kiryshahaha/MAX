from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/")
async def get_users():
    # получить список пользователей (для админки)
    return {"users": []}

@router.get("/{user_id}")
async def get_user(user_id:int):
    # получить информацию по конкретному пользователю
    return {"user_id": user_id, "detail":"User info (stub)"}

@router.put("{user_id}")
async def update_user(user_id:int, data:dict):
    # обновить профиль пользователя
    return {"message":f"User {user_id} updated (stub)"}

