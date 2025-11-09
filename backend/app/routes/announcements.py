from fastapi import APIRouter

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("/")
async def get_announcements():
    # получить список объявлений (из парсера или Supabase)
    return {"announcements":[]}

@router.get("/{announcement_id}")
async def get_announcement(announcement_id:int):
    # получить конкретное объявление
    return {"id":announcement_id, "detail":"Announcement detail (stub)"}
