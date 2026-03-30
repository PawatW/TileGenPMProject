FROM python:3.12-slim

WORKDIR /app

# Install system deps for Pillow / psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libheif-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/entrypoint.sh

ENV FLASK_ENV=production
EXPOSE 5001

CMD ["/app/entrypoint.sh"]
