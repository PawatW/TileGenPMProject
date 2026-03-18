วิธีใช้งาน
# 1. คัดลอก env file
cp .env.example .env

# 2. แก้ค่าใน .env
#    - POSTGRES_PASSWORD
#    - JWT_SECRET (ใช้ openssl rand -hex 32)
#    - OPENROUTER_API_KEY

# 3. รัน
docker compose up --build

Frontend: http://localhost:3000
Backend API: http://localhost:5001
PostgreSQL: localhost:5432
Demo account: demo / demo123 (สร้างอัตโนมัติ)
วิธีเริ่มแอป
แบบ Docker (แนะนำ — ง่ายสุด)
# 1. ไปที่ root ของ project
cd /home/user/PMProject

# 2. คัดลอก env file แล้วแก้ค่า
cp .env.example .env

# 3. แก้ .env ขั้นต่ำ:
#    OPENROUTER_API_KEY=sk-or-v1-...   ← ใส่ key จริง (ถ้าใช้ฟีเจอร์ AI)
#    JWT_SECRET=ใส่-random-string-ยาวๆ

# 4. Build + รัน
docker compose up --build

เปิดเบราว์เซอร์ที่ http://localhost:3000

แบบ Local Dev (ไม่ใช้ Docker)
ต้องรัน 3 อย่าง แยกกัน:

Terminal 1 — PostgreSQL

# ต้องติดตั้ง postgres ก่อน หรือรัน postgres ด้วย docker เดี่ยว
docker run -d --name pg \
  -e POSTGRES_DB=studiopm \
  -e POSTGRES_USER=studiopm \
  -e POSTGRES_PASSWORD=studiopm \
  -p 5432:5432 postgres:16-alpine

Terminal 2 — Backend

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# ตั้ง env vars
export DATABASE_URL=postgresql://studiopm:studiopm@localhost:5432/studiopm
export JWT_SECRET=dev-secret
export OPENROUTER_API_KEY=sk-or-v1-...   # optional

python app.py
# → รันที่ http://localhost:5001

Terminal 3 — Frontend

cd frontend
npm install

# ตั้ง env
echo "BACKEND_URL=http://localhost:5001" > .env.local

npm run dev
# → รันที่ http://localhost:3000

Login เข้าระบบ
username	password
demo	demo123