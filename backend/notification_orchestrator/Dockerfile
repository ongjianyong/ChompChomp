FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5012

CMD ["gunicorn", "--bind", "0.0.0.0:5012", "app:app"]
