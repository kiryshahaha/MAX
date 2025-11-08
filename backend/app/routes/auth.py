from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
async def login_user(data: dict):
    # TODO: логика авторизации через utils/auth.py
    return {"message": "Login endpoint (stub)"}

@router.post("/register")
async def register_user(data: dict):
    # TODO: логика регистрации в Supabase
    return {"message": "Register endpoint (stub)"}

@router.post("/logout")
async def logout_user():
    # TODO: сброс токена / сессии
    return {"message": "Logout endpoint (stub)"}
