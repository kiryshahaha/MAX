from pydantic import BaseModel, validator
from datetime import datetime

class AppointmentCreate(BaseModel):
    user_id: str
    psychologist_name: str
    appointment_time: datetime
    notes: str | None = None

    @validator("appointment_time")
    def validate_hour(cls, v: datetime):
        if v.minute != 0 or v.second != 0 or v.microsecond != 0:
            raise ValueError("Время должно быть кратно целому часу (например, 09:00, 14:00)")
        return v
