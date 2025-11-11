FROM python:3.11-slim

WORKDIR /app

COPY psychologist_service/ ./psychologist_service/
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/app

CMD ["uvicorn", "psychologist_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
