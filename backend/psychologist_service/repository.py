import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async def insert_appointment(data: dict):
    result = supabase.table("appointments").insert(data).execute()
    if hasattr(result, "error") and result.error:
        raise Exception(result.error)
    return result.data[0]

async def get_appointments_by_user(user_id: str):
    result = supabase.table("appointments").select("*").eq("user_id", user_id).execute()
    if hasattr(result, "error") and result.error:
        raise Exception(result.error)
    return result.data

async def get_appointments_by_psychologist(psychologist_name: str):
    result = supabase.table("appointments").select("*").eq("psychologist_name", psychologist_name).execute()
    if hasattr(result, "error") and result.error:
        raise Exception(result.error)
    return result.data
