import os

from flask import Flask
from flask_cors import CORS
from pillow_heif import register_heif_opener
from werkzeug.security import generate_password_hash

from models import User, db

register_heif_opener()


def create_app() -> Flask:
    app = Flask(__name__)

    # ── database ──────────────────────────────────────────────────────────────
    database_url = os.environ.get("DATABASE_URL", "sqlite:///dev.db")
    # SQLAlchemy requires postgresql:// not postgres://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024  # 15 MB

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── blueprints ────────────────────────────────────────────────────────────
    from routes.auth import bp as auth_bp
    from routes.catalog import bp as catalog_bp
    from routes.designs import bp as designs_bp
    from routes.images import bp as images_bp
    from routes.planner_catalog import bp as planner_catalog_bp
    from routes.quotations import bp as quotations_bp

    for blueprint in (
        auth_bp,
        designs_bp,
        catalog_bp,
        planner_catalog_bp,
        quotations_bp,
        images_bp,
    ):
        app.register_blueprint(blueprint)

    return app


def init_database(app: Flask) -> None:
    """Initialize database objects and seed baseline data once."""
    with app.app_context():
        db.create_all()
        _seed_demo_user(app)


def _seed_demo_user(app: Flask) -> None:
    """Create a demo account on first startup."""
    if not User.query.filter_by(username="demo").first():
        demo = User(
            username="demo",
            display_name="Demo User",
            password_hash=generate_password_hash("demo123"),
        )
        db.session.add(demo)
        db.session.commit()
        app.logger.info("Demo user seeded  →  username: demo  /  password: demo123")


app = create_app()

if __name__ == "__main__":
    init_database(app)
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=os.environ.get("FLASK_ENV") == "development",
    )
