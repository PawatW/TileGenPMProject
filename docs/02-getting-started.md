# การติดตั้งและเริ่มต้นใช้งาน

## วิธีที่ 1 — Docker (แนะนำ)

วิธีนี้ง่ายที่สุด ต้องติดตั้ง [Docker Desktop](https://www.docker.com/products/docker-desktop/) ไว้ก่อน

```bash
# 1. ไปที่ root ของโปรเจกต์
cd /path/to/PMProject

# 2. คัดลอก environment file
cp backend/.env.example backend/.env

# 3. แก้ไขค่าใน backend/.env อย่างน้อย:
#    OPENROUTER_API_KEY=sk-or-v1-...   ← ใส่ key จริง (ถ้าใช้ฟีเจอร์ AI)
#    JWT_SECRET=ใส่-random-string-ยาวๆ  ← ตัวอย่าง: openssl rand -hex 32

# 4. Build และรัน
docker compose up --build
```

เปิดเบราว์เซอร์ที่ **http://localhost:3000**

---

## วิธีที่ 2 — Local Development (ไม่ใช้ Docker)

ต้องรัน 3 บริการแยกกัน:

### Terminal 1 — PostgreSQL

```bash
docker run -d --name pg \
  -e POSTGRES_DB=studiopm \
  -e POSTGRES_USER=studiopm \
  -e POSTGRES_PASSWORD=studiopm \
  -p 5432:5432 postgres:16-alpine
```

### Terminal 2 — Backend (Flask)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://studiopm:studiopm@localhost:5432/studiopm
export JWT_SECRET=dev-secret
export OPENROUTER_API_KEY=sk-or-v1-...   # optional

python app.py
# → รันที่ http://localhost:5001
```

### Terminal 3 — Frontend (Next.js)

```bash
cd frontend
npm install

echo "BACKEND_URL=http://localhost:5001" > .env.local

npm run dev
# → รันที่ http://localhost:3000
```

---

## Environment Variables

| Variable | ที่ตั้ง | ความสำคัญ | คำอธิบาย |
|---|---|---|---|
| `POSTGRES_PASSWORD` | backend/.env | จำเป็น | รหัสผ่าน PostgreSQL |
| `JWT_SECRET` | backend/.env | จำเป็น | Secret key สำหรับ JWT token |
| `OPENROUTER_API_KEY` | backend/.env | ไม่บังคับ | API key สำหรับฟีเจอร์ AI |
| `BACKEND_URL` | frontend/.env.local | จำเป็น (Local dev) | URL ของ Backend API |

---

## บัญชี Demo

ระบบสร้างบัญชีตัวอย่างให้อัตโนมัติเมื่อเริ่มต้นครั้งแรก:

| Username | Password |
|---|---|
| `demo` | `demo123` |
