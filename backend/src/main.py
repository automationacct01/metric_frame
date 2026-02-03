"""FastAPI main application for multi-framework cybersecurity metrics.

Supports NIST CSF 2.0 (with Cyber AI Profile) and NIST AI RMF 1.0.
Supports both PostgreSQL (Docker/server) and SQLite (desktop app).
"""

import os
import logging
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .db import engine, get_db, IS_SQLITE, IS_POSTGRESQL, get_database_info, init_db
from .models import Base, Framework
from .schemas import HealthResponse
from .routers import metrics, scores, ai, csf, catalogs, frameworks, ai_providers, users, auth


# Configure rate limiter
# Uses client IP for identification
limiter = Limiter(key_func=get_remote_address)
rate_limit_logger = logging.getLogger("rate_limiter")


load_dotenv()


def check_database_needs_seeding(db: Session) -> bool:
    """Check if database needs initial seeding (no frameworks exist)."""
    try:
        framework_count = db.query(Framework).count()
        return framework_count == 0
    except Exception:
        return True


def seed_database_if_empty():
    """Seed the database with initial data if it's empty.

    For SQLite (desktop app), this runs on first launch.
    For PostgreSQL (Docker), seeding is handled by dev.sh or deployment scripts.
    """
    from .db import SessionLocal
    db = SessionLocal()
    try:
        if check_database_needs_seeding(db):
            print("Database is empty, seeding initial data...")
            # Import and run the seeding script
            try:
                from .seeds.seed_all import run_full_seed
                run_full_seed(clear_existing=False)
                print("Database seeding complete!")
            except ImportError:
                print("Warning: Seeding module not found, skipping initial data seed")
            except Exception as e:
                print(f"Warning: Failed to seed database: {e}")
        else:
            print("Database already contains data, skipping seed")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    db_info = get_database_info()
    print(f"Starting Multi-Framework Cybersecurity Metrics API...")
    print(f"Database type: {db_info['type']}")

    if IS_SQLITE:
        # For SQLite (desktop app): Create tables and seed data automatically
        print("SQLite mode: Auto-initializing database...")
        init_db()  # Creates all tables from models
        seed_database_if_empty()
    else:
        # For PostgreSQL (Docker): Just create tables, seeding is handled separately
        print("PostgreSQL mode: Creating tables if not exist...")
        Base.metadata.create_all(bind=engine)

    yield
    # Shutdown
    print("Shutting down Multi-Framework Cybersecurity Metrics API...")


# Create FastAPI app
app = FastAPI(
    title="Multi-Framework Cybersecurity Metrics API",
    description="""
API for managing cybersecurity Key Risk Indicators aligned to multiple NIST frameworks:
- **NIST Cybersecurity Framework 2.0** (with integrated Cyber AI Profile)
- **NIST AI Risk Management Framework 1.0**

Features:
- Framework-agnostic metrics management
- AI-powered recommendations (Claude Sonnet 4.5)
- Custom catalog import and mapping
- Executive dashboards and scoring
    """,
    version="0.2.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# Add rate limiter to app state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5175").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
api_prefix = os.getenv("API_PREFIX", "/api/v1")
app.include_router(frameworks.router, prefix=api_prefix)  # Frameworks router includes its own /frameworks prefix
app.include_router(metrics.router, prefix=f"{api_prefix}/metrics", tags=["metrics"])
app.include_router(scores.router, prefix=f"{api_prefix}/scores", tags=["scores"])
app.include_router(ai.router, prefix=f"{api_prefix}/ai", tags=["ai"])
app.include_router(csf.router, prefix=f"{api_prefix}")  # CSF router includes its own /csf prefix
app.include_router(catalogs.router, prefix=f"{api_prefix}")  # Catalogs router includes its own /catalogs prefix
app.include_router(ai_providers.router, prefix=api_prefix)  # AI providers router includes its own /ai-providers prefix
app.include_router(users.router, prefix=api_prefix)  # Users router includes its own /users prefix
app.include_router(auth.router, prefix=api_prefix)  # Auth router includes its own /auth prefix


@app.get("/", response_model=dict)
async def root():
    """Root endpoint."""
    return {
        "message": "Multi-Framework Cybersecurity Metrics API",
        "version": "0.2.0",
        "docs_url": "/docs",
        "api_prefix": api_prefix,
        "supported_frameworks": ["csf_2_0", "ai_rmf"],
    }


@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint."""
    database_connected = True
    ai_service_available = True

    try:
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception:
        database_connected = False

    # Test AI service availability (Claude-only)
    try:
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        ai_service_available = bool(anthropic_key and anthropic_key != "your-anthropic-api-key-here")
    except Exception:
        ai_service_available = False

    status = "healthy" if database_connected else "unhealthy"

    return HealthResponse(
        status=status,
        timestamp=datetime.utcnow(),
        database_connected=database_connected,
        ai_service_available=ai_service_available,
    )


@app.get("/health/database")
async def database_info():
    """Get database configuration info."""
    return get_database_info()


@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler."""
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("DEBUG") == "true" else False,
    )
