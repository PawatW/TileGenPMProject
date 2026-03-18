import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, jsonify, request

from models import User

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-please-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


def generate_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "กรุณาเข้าสู่ระบบ"}), 401
        token = auth_header[7:]
        try:
            payload = decode_token(token)
            user = db_get_user(payload["sub"])
            if not user:
                return jsonify({"error": "ไม่พบผู้ใช้"}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "session หมดอายุ กรุณาเข้าสู่ระบบใหม่"}), 401
        except Exception:
            return jsonify({"error": "token ไม่ถูกต้อง"}), 401
        return f(*args, **kwargs)

    return decorated


def db_get_user(user_id: str):
    return User.query.get(user_id)
