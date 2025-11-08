from fastapi import APIRouter

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/")
async def get_tasks():
    return {"tasks": ["Задание 1", "Задание 2", "Задание 3"]}

@router.post("/")
async def create_task(task:dict):
    # здесь потом добавим запись в Supabase
    return {"message": "Task created", "task": task}
