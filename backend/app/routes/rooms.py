from fastapi import APIRouter, Query

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("/")
async def get_rooms(search: str | None = Query(None, description="Поиск по номеру или названию аудитории")):
    # Возвращает список всех аудиторий, с возможностью поиска

    if search:
        return {"message": f"Search results for room '{search}' (stub)"}
    
    return {"message": "Rooms endpoint (stub)"}

@router.get("/{room_id}")
async def get_room_by_id(room_id: str):
    # Возвращает информацию об одной аудитории.

    return {"message": f"Room {room_id} details (stub)"}
