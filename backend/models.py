from datetime import datetime, timezone
import uuid

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _uuid():
    return str(uuid.uuid4())


def _now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(256), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(16), nullable=False, default="user")  # user | admin
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    designs = db.relationship(
        "RoomDesign", backref="owner", lazy=True, cascade="all, delete-orphan"
    )
    catalog_items = db.relationship(
        "CalculatorItem", backref="owner", lazy=True, cascade="all, delete-orphan"
    )
    quotations = db.relationship(
        "Quotation", backref="creator", lazy=True, cascade="all, delete-orphan"
    )


class RoomDesign(db.Model):
    """Stores named design draft slots per user (slot_1 .. slot_5)."""

    __tablename__ = "room_designs"
    __table_args__ = (
        db.UniqueConstraint("user_id", "slot_key", name="uq_user_slot"),
    )

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False, index=True
    )
    slot_key = db.Column(db.String(32), nullable=False)  # "slot_1" .. "slot_5"
    name = db.Column(db.String(256), nullable=True)
    state_json = db.Column(db.JSON, nullable=True)  # full serialized design state
    saved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )


class CalculatorItem(db.Model):
    """Tile catalog items for the calculator page (per user)."""

    __tablename__ = "calculator_items"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False, index=True
    )
    name = db.Column(db.String(256), nullable=False)
    width_cm = db.Column(db.Float, nullable=False, default=30.0)
    height_cm = db.Column(db.Float, nullable=False, default=30.0)
    price_per_box = db.Column(db.Float, nullable=False, default=0.0)
    tiles_per_box = db.Column(db.Integer, nullable=False, default=1)
    color = db.Column(db.String(16), nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)


class Quotation(db.Model):
    """Saved quotation records."""

    __tablename__ = "quotations"

    id = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id"), nullable=False, index=True
    )
    customer_name = db.Column(db.String(256), nullable=True)
    project_name = db.Column(db.String(256), nullable=True)
    tile_pattern_label = db.Column(db.String(256), nullable=True)
    wall_pattern_label = db.Column(db.String(256), nullable=True)
    grid_width = db.Column(db.Float, nullable=True)
    grid_height = db.Column(db.Float, nullable=True)
    wall_height = db.Column(db.Float, nullable=True)
    total_area_sqm = db.Column(db.Float, nullable=True)
    tile_count = db.Column(db.Integer, nullable=True)
    box_count = db.Column(db.Integer, nullable=True)
    price_per_box = db.Column(db.Float, nullable=True)
    total_price = db.Column(db.Float, nullable=True)
    pdf_data = db.Column(db.Text, nullable=True)  # base64-encoded PDF
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)
