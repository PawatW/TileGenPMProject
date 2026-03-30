import uuid

from flask import Blueprint, g, jsonify, request

from auth import require_auth
from models import PlannerCatalogItem, db

bp = Blueprint("planner_catalog", __name__)

_ALLOWED_TYPES = {"tile", "wall", "fixture"}
_ITEM_PREFIX = {
    "tile": "custom_",
    "wall": "custom_wall_",
    "fixture": "custom_fixture_",
}
_ITEM_PLURAL = {
    "tile": "tiles",
    "wall": "walls",
    "fixture": "fixtures",
}
_DEFAULT_LABEL = {
    "tile": "ลายกระเบื้อง",
    "wall": "ลายกำแพง",
    "fixture": "ชนิดประตู/หน้าต่าง",
}


def _new_item_key(item_type: str) -> str:
    return f"{_ITEM_PREFIX[item_type]}{uuid.uuid4().hex[:12]}"


def _normalize_item_payload(item_type: str, payload: dict | None) -> dict:
    data = dict(payload or {})
    data.pop("dbId", None)
    data.pop("id", None)
    data.pop("createdAt", None)
    data.pop("key", None)
    data.pop("label", None)

    if item_type in {"tile", "wall"}:
        data["type"] = "image"

    if item_type == "wall":
        data["repeatX"] = float(data.get("repeatX", 2) or 2)
        data["repeatYPerMeter"] = float(data.get("repeatYPerMeter", 1) or 1)

    if item_type == "fixture":
        render_as = str(data.get("renderAs") or "door").lower()
        data["renderAs"] = "window" if render_as == "window" else "door"
        preview = data.get("preview") if isinstance(data.get("preview"), dict) else {}
        default_preview = (
            {"base": "#93c5fd", "accent": "#e2e8f0"}
            if data["renderAs"] == "window"
            else {"base": "#b08968", "accent": "#fef9c3"}
        )
        data["preview"] = {
            "base": str(preview.get("base") or default_preview["base"]),
            "accent": str(preview.get("accent") or default_preview["accent"]),
        }

    return data


def _serialize_entry(entry: PlannerCatalogItem) -> dict:
    payload = _normalize_item_payload(entry.item_type, entry.payload_json)
    payload["key"] = entry.item_key
    payload["label"] = entry.label
    payload["dbId"] = entry.id
    return payload


@bp.get("/api/planner/catalog")
@require_auth
def list_catalog_items():
    items = (
        PlannerCatalogItem.query.filter_by(user_id=g.current_user.id)
        .order_by(PlannerCatalogItem.created_at)
        .all()
    )

    result = {"tiles": [], "walls": [], "fixtures": []}
    for item in items:
        if item.item_type not in _ALLOWED_TYPES:
            continue
        result[_ITEM_PLURAL[item.item_type]].append(_serialize_entry(item))

    return jsonify(result)


@bp.post("/api/planner/catalog")
@require_auth
def create_catalog_item():
    data = request.get_json(force=True) or {}
    item_type = str(data.get("type") or "").strip().lower()
    if item_type not in _ALLOWED_TYPES:
        return jsonify({"error": "ชนิดรายการไม่ถูกต้อง"}), 400

    payload = data.get("item") if isinstance(data.get("item"), dict) else {}
    item_key = str(data.get("key") or payload.get("key") or "").strip() or _new_item_key(item_type)
    label = str(data.get("label") or payload.get("label") or "").strip() or _DEFAULT_LABEL[item_type]

    existing = PlannerCatalogItem.query.filter_by(
        user_id=g.current_user.id,
        item_type=item_type,
        item_key=item_key,
    ).first()
    if existing:
        return jsonify({"error": "มีรายการนี้อยู่แล้ว"}), 409

    entry = PlannerCatalogItem(
        user_id=g.current_user.id,
        item_type=item_type,
        item_key=item_key,
        label=label,
        payload_json=_normalize_item_payload(item_type, payload),
    )
    db.session.add(entry)

    db.session.commit()

    return jsonify({"type": item_type, "item": _serialize_entry(entry)}), 201


@bp.delete("/api/planner/catalog/<item_id>")
@require_auth
def delete_catalog_item(item_id: str):
    entry = PlannerCatalogItem.query.filter_by(
        id=item_id,
        user_id=g.current_user.id,
    ).first_or_404()

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"ok": True})
