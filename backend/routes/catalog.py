from flask import Blueprint, g, jsonify, request

from auth import require_auth
from models import CalculatorItem, db

bp = Blueprint("catalog", __name__)


def _item_dict(item: CalculatorItem) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "widthCm": item.width_cm,
        "heightCm": item.height_cm,
        "pricePerBox": item.price_per_box,
        "tilesPerBox": item.tiles_per_box,
        "color": item.color,
        "note": item.note,
        "createdAt": item.created_at.isoformat(),
    }


@bp.get("/api/catalog")
@require_auth
def list_items():
    items = (
        CalculatorItem.query.filter_by(user_id=g.current_user.id)
        .order_by(CalculatorItem.created_at)
        .all()
    )
    return jsonify([_item_dict(i) for i in items])


@bp.post("/api/catalog")
@require_auth
def create_item():
    data = request.get_json(force=True) or {}
    item = CalculatorItem(
        user_id=g.current_user.id,
        name=(data.get("name") or "").strip() or "กระเบื้อง",
        width_cm=float(data.get("widthCm", 30)),
        height_cm=float(data.get("heightCm", 30)),
        price_per_box=float(data.get("pricePerBox", 0)),
        tiles_per_box=max(1, int(data.get("tilesPerBox", 1))),
        color=data.get("color"),
        note=data.get("note"),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(_item_dict(item)), 201


@bp.put("/api/catalog/<item_id>")
@require_auth
def update_item(item_id):
    item = CalculatorItem.query.filter_by(
        id=item_id, user_id=g.current_user.id
    ).first_or_404()
    data = request.get_json(force=True) or {}
    if "name" in data:
        item.name = data["name"]
    if "widthCm" in data:
        item.width_cm = float(data["widthCm"])
    if "heightCm" in data:
        item.height_cm = float(data["heightCm"])
    if "pricePerBox" in data:
        item.price_per_box = float(data["pricePerBox"])
    if "tilesPerBox" in data:
        item.tiles_per_box = max(1, int(data["tilesPerBox"]))
    if "color" in data:
        item.color = data["color"]
    if "note" in data:
        item.note = data["note"]
    db.session.commit()
    return jsonify(_item_dict(item))


@bp.delete("/api/catalog/<item_id>")
@require_auth
def delete_item(item_id):
    item = CalculatorItem.query.filter_by(
        id=item_id, user_id=g.current_user.id
    ).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({"ok": True})
