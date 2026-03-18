
## Run

```bash
git clone https://github.com/Krittat/TileGen.git
cd TileGen
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# สำหรับใช้ทดสอบกับรูปจริง
# export OPENROUTER_API_KEY="<API_KEY>"

python app.py
```

เปิดที่: http://127.0.0.1:5001

หยุดเซิร์ฟเวอร์: `Ctrl + C`



Setup ครั้งแรก (ทำครั้งเดียว)
Frontend (Next.js)
cd frontend
npm install

Backend (Flask) — ใช้เฉพาะฟีเจอร์ "ทดสอบกับรูปจริง"
cd backend
python3 -m venv .venv
source .venv/bin/activate      # macOS/Linux
# .venv\Scripts\activate       # Windows
pip install -r requirements.txt

รันทุกครั้ง
Terminal 1 — Frontend:

cd frontend
npm run dev

เข้าที่ http://localhost:3000

Terminal 2 — Backend (ถ้าต้องการฟีเจอร์ AI รูปจริง):

cd backend
source .venv/bin/activate
export OPENROUTER_API_KEY="your_key_here"   # ถ้าต้องการใช้ AI
python app.py

Backend รันที่ http://localhost:5001

ข้อมูล Auth
ระบบใช้ localStorage ล้วนๆ ไม่มี database:

มี demo account สร้างให้อัตโนมัติ: demo / demo123
สมัครสมาชิกใหม่ได้ในหน้า login — ข้อมูลเก็บในเบราว์เซอร์เครื่องนั้น
สรุป dependencies
ส่วน	Technology	Install
Frontend	Next.js 15, React 19, TypeScript	npm install
3D Engine	Three.js 0.160	โหลดผ่าน CDN อัตโนมัติ
Backend	Flask, Pillow, pillow-heif	pip install -r requirements.txt
Database	ไม่มี — ใช้ localStorage	—
