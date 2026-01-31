"""Database configuration and session management.

Supports both PostgreSQL (Docker/server deployments) and SQLite (desktop app).
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Default to PostgreSQL for backward compatibility
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://nist:nist@localhost:5432/nistmetrics")

# Detect database type
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_POSTGRESQL = DATABASE_URL.startswith("postgresql")

# Configure engine based on database type
if IS_SQLITE:
    # SQLite-specific configuration
    # check_same_thread=False is needed for FastAPI's async support
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    )

    # Enable foreign key support in SQLite (disabled by default)
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Get database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables.

    For SQLite (desktop app), this creates all tables directly.
    For PostgreSQL (Docker), Alembic migrations are used instead.
    """
    if IS_SQLITE:
        # Import models to ensure they're registered with Base
        from . import models  # noqa: F401
        Base.metadata.create_all(bind=engine)


def get_database_info():
    """Return information about the current database configuration."""
    return {
        "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,  # Hide credentials
        "type": "sqlite" if IS_SQLITE else "postgresql" if IS_POSTGRESQL else "unknown",
        "is_sqlite": IS_SQLITE,
        "is_postgresql": IS_POSTGRESQL,
    }
