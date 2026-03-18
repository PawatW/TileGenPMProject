from flask import Blueprint, g, jsonify, request

from auth import require_auth
from models import Quotation, db

bp = Blueprint("quotations", __name__)


def _q_dict(q: Quotation, include_pdf: bool = False) -> dict:
    d = {
        "id": q.id,
        "customerName": q.customer_name,
        "projectName": q.project_name,
        "tilePatternLabel": q.tile_pattern_label,
        "wallPatternLabel": q.wall_pattern_label,
        "gridWidth": q.grid_width,
        "gridHeight": q.grid_height,
        "wallHeight": q.wall_height,
        "totalAreaSqm": q.total_area_sqm,
        "tileCount": q.tile_count,
        "boxCount": q.box_count,
        "pricePerBox": q.price_per_box,
        "totalPrice": q.total_price,
        "hasPdf": bool(q.pdf_data),
        "createdAt": q.created_at.isoformat(),
    }
    if include_pdf:
        d["pdfData"] = q.pdf_data
    return d


@bp.get("/api/quotations")
@require_auth
def list_quotations():
    qs = (
        Quotation.query.filter_by(user_id=g.current_user.id)
        .order_by(Quotation.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify([_q_dict(q) for q in qs])


@bp.post("/api/quotations")
@require_auth
def create_quotation():
    data = request.get_json(force=True) or {}
    q = Quotation(
        user_id=g.current_user.id,
        customer_name=data.get("customerName"),
        project_name=data.get("projectName"),
        tile_pattern_label=data.get("tilePatternLabel"),
        wall_pattern_label=data.get("wallPatternLabel"),
        grid_width=data.get("gridWidth"),
        grid_height=data.get("gridHeight"),
        wall_height=data.get("wallHeight"),
        total_area_sqm=data.get("totalAreaSqm"),
        tile_count=data.get("tileCount"),
        box_count=data.get("boxCount"),
        price_per_box=data.get("pricePerBox"),
        total_price=data.get("totalPrice"),
        pdf_data=data.get("pdfData"),
    )
    db.session.add(q)
    db.session.commit()
    return jsonify(_q_dict(q)), 201


@bp.get("/api/quotations/<q_id>")
@require_auth
def get_quotation(q_id):
    q = Quotation.query.filter_by(
        id=q_id, user_id=g.current_user.id
    ).first_or_404()
    return jsonify(_q_dict(q, include_pdf=True))
