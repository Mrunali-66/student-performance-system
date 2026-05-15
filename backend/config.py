# config.py — Centralized application configuration

import os
from datetime import timedelta
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Flask ────────────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "dev_secret_change_in_production"
    )

    DEBUG = os.getenv(
        "FLASK_DEBUG",
        "False"
    ).lower() == "true"

    PORT = int(os.getenv("PORT", 5000))

    FRONTEND_URL = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )

    # ── PostgreSQL / SQLAlchemy ─────────────────────────────────────────────
    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = os.getenv("DB_PORT", "5432")
    DB_NAME     = os.getenv("DB_NAME", "student_progress")
    DB_USER     = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Jiya@664")

    # quote_plus encodes special chars like @ so they don't break the URL
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{DB_USER}:{quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "pool_size": 10,
        "max_overflow": 20,
    }

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "dev_secret_change_in_production"
    )

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=int(
            os.getenv(
                "JWT_ACCESS_TOKEN_EXPIRES_HOURS",
                24
            )
        )
    )

    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME    = "Authorization"
    JWT_HEADER_TYPE    = "Bearer"

    # ── Allowed branches ─────────────────────────────────────────────────────
    ALLOWED_BRANCHES = [
        "Data Science",
        "Python Development",
        "Java Development",
        "AI & Machine Learning",
    ]

    # ── Allowed roles ────────────────────────────────────────────────────────
    ALLOWED_ROLES = [
        "student",
        "teacher"
    ]


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
}

ActiveConfig = config_map.get(
    os.getenv("FLASK_ENV", "development"),
    DevelopmentConfig
)
