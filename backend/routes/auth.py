from flask import Blueprint, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from auth import generate_token, require_auth
from models import User, db

bp = Blueprint("auth", __name__)


def _user_dict(user: User) -> dict:
    return {"id": user.id, "username": user.username, "name": user.display_name}


@bp.post("/api/auth/register")
def register():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    display_name = (data.get("name") or username).strip()

    if len(username) < 3:
        return jsonify({"error": "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"}), 400
    if len(password) < 4:
        return jsonify({"error": "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"}), 409

    user = User(
        username=username,
        display_name=display_name,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({"token": token, "user": _user_dict(user)}), 201


@bp.post("/api/auth/login")
def login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}), 401

    token = generate_token(user.id)
    return jsonify({"token": token, "user": _user_dict(user)})


@bp.get("/api/auth/me")
@require_auth
def me():
    return jsonify(_user_dict(g.current_user))
