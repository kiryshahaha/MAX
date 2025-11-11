from fastapi import FastAPI, HTTPException
from schemas import AppointmentCreate
from service import create_appointment, get_user_appointments
from service import get_available_slots, get_schedule_for_psychologist
from datetime import datetime
from fastapi import Query


app = FastAPI(title="Psychologist Appointment Service")

@app.post("/appointments")
async def post_appointment(appointment: AppointmentCreate):
    try:
        new_appt = await create_appointment(appointment.dict())
        return {"message": "Запись создана", "appointment": new_appt}
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/appointments/{user_id}")
async def get_appointments(user_id: str):
    try:
        return {"appointments": await get_user_appointments(user_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/available_slots")
async def available_slots(psychologist_name: str = Query(...), date: str = Query(...)):
    """
    Получить свободные часы для записи пользователя
    """
    try:
        date_obj = datetime.fromisoformat(date)
        slots = await get_available_slots(psychologist_name, date_obj)
        return {"available_slots": slots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/schedule/{psychologist_name}")
async def psychologist_schedule(psychologist_name: str, date: str = Query(...)):
    """
    Показать расписание психолога на конкретный день
    """
    try:
        date_obj = datetime.fromisoformat(date)
        schedule = await get_schedule_for_psychologist(psychologist_name, date_obj)
        return {"schedule": schedule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
