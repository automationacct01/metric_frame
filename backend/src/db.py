"""Database configuration and session management.

Supports both PostgreSQL (Docker/server deployments) and SQLite (desktop app).
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()


def is_desktop_mode():
    """Detect if running as a desktop app (PyInstaller bundle or explicit desktop mode).

    Only activates desktop mode when:
    1. Running from a PyInstaller bundle (sys.frozen), OR
    2. METRICFRAME_DESKTOP_MODE=true is explicitly set

    This prevents accidental desktop mode activation in misconfigured Docker
    deployments, which would grant unauthenticated admin access.
    """
    # Check if running from PyInstaller bundle
    if getattr(sys, 'frozen', False):
        return True
    # Check for explicit desktop mode environment variable
    if os.getenv("METRICFRAME_DESKTOP_MODE", "").lower() == "true":
        return True
    return False


def get_desktop_db_path():
    """Get the SQLite database path for desktop mode."""
    # Use platform-appropriate user data directory
    if sys.platform == "darwin":  # macOS
        base_dir = Path.home() / "Library" / "Application Support" / "metricframe"
    elif sys.platform == "win32":  # Windows
        base_dir = Path(os.getenv("APPDATA", Path.home())) / "metricframe"
    else:  # Linux and others
        base_dir = Path.home() / ".local" / "share" / "metricframe"

    # Create directory if it doesn't exist
    base_dir.mkdir(parents=True, exist_ok=True)

    return base_dir / "metricframe.db"


def get_database_url():
    """Determine the database URL based on environment."""
    # First check for explicit DATABASE_URL
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    # Check if we're in desktop mode
    if is_desktop_mode():
        db_path = get_desktop_db_path()
        return f"sqlite:///{db_path}"

    # Default to PostgreSQL for server deployments
    return "postgresql://nist:nist@localhost:5432/nistmetrics"


# Get the database URL
DATABASE_URL = get_database_url()
IS_DESKTOP_MODE = is_desktop_mode()

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
        "is_desktop_mode": IS_DESKTOP_MODE,
    }
