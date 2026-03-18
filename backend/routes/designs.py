from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from auth import require_auth
from models import RoomDesign, db

bp = Blueprint("designs", __name__)

VALID_SLOTS = {f"slot_{i}" for i in range(1, 6)}


@bp.get("/api/designs/slots")
@require_auth
def list_slots():
    """Return metadata for all 5 slots of the current user."""
    user_id = g.current_user.id
    designs = RoomDesign.query.filter_by(user_id=user_id).all()
    result = {}
    for d in designs:
        result[d.slot_key] = {
            "slotKey": d.slot_key,
            "name": d.name,
            "savedAt": d.saved_at.isoformat() if d.saved_at else None,
        }
    return jsonify(result)


@bp.get("/api/designs/slot/<slot_key>")
@require_auth
def get_slot(slot_key):
    if slot_key not in VALID_SLOTS:
        return jsonify({"error": "slot ไม่ถูกต้อง"}), 400
    design = RoomDesign.query.filter_by(
        user_id=g.current_user.id, slot_key=slot_key
    ).first()
    if not design or not design.state_json:
        return jsonify(None)
    return jsonify(
        {
            "slotKey": design.slot_key,
            "name": design.name,
            "savedAt": design.saved_at.isoformat() if design.saved_at else None,
            "state": design.state_json,
        }
    )


@bp.put("/api/designs/slot/<slot_key>")
@require_auth
def save_slot(slot_key):
    if slot_key not in VALID_SLOTS:
        return jsonify({"error": "slot ไม่ถูกต้อง"}), 400
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip() or f"แบบร่าง {slot_key[-1]}"
    state = data.get("state")

    user_id = g.current_user.id
    now = datetime.now(timezone.utc)
    design = RoomDesign.query.filter_by(user_id=user_id, slot_key=slot_key).first()
    if design:
        design.name = name
        design.state_json = state
        design.saved_at = now
        design.updated_at = now
    else:
        design = RoomDesign(
            user_id=user_id,
            slot_key=slot_key,
            name=name,
            state_json=state,
            saved_at=now,
        )
        db.session.add(design)
    db.session.commit()
    return jsonify({"ok": True, "savedAt": now.isoformat()})


@bp.delete("/api/designs/slot/<slot_key>")
@require_auth
def delete_slot(slot_key):
    if slot_key not in VALID_SLOTS:
        return jsonify({"error": "slot ไม่ถูกต้อง"}), 400
    design = RoomDesign.query.filter_by(
        user_id=g.current_user.id, slot_key=slot_key
    ).first()
    if design:
        db.session.delete(design)
        db.session.commit()
    return jsonify({"ok": True})
