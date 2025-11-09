from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import tasks, sync, announcements,auth,schedule, users, faculties, rooms, teachers


app = FastAPI(
    title="Student Portal Backend",
    description="API для портала (бота + миниэпп)",
)

# Разрешим доступ фронту
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # позже лучше ограничить Netlify-доменом
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роуты
app.include_router(tasks.router)
app.include_router(sync.router)
app.include_router(users.router)
app.include_router(announcements.router)
app.include_router(schedule.router)
app.include_router(auth.router)
app.include_router(faculties.router)
app.include_router(rooms.router)
app.include_router(teachers.router)
@app.get("/")
async def root():
    return {"message":"Backend API is running"}