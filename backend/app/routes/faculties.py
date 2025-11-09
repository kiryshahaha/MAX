from fastapi import APIRouter 

router = APIRouter(prefix="/faculties", tags=["Faculties"])

@router.get("/")
async def get_faculties():
    # Возвращает список всех институтов и факультетов
    return {"message": "Faculties endpoint (stub)"}

@router.get("/{faculty_id}")
async def get_faculty_by_id(faculty_id:int):
    # Возвращает информацию о конкретном факультете
    return {"message": "fFaculty {faculty_id} details (stub)"} 

