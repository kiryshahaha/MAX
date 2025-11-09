from fastapi import APIRouter, Query

router = APIRouter(prefix="/teachers", tags=["Teachers"])

@router.get("/")
async def get_teachers(search:str | None = Query(None, description="Поиск по имени преподавателя")):
    # Возвращает список преподавателей. Можно искать по имени
    if search:
        return {"message": f"Search results for '{search}' (stub)"}
    return {"message": "Teachers endpoint (stub)"}

@router.get("/{teacher_id}")
async def get_teacher_by_id(teacher_id:str):
    # Возвращает информацию о конкретном преподавателе
    return {"message": f"Teacher {teacher_id} details (stub)"}
