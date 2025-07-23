"""FastAPI main application for NIST CSF 2.0 metrics."""

import os
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from .db import engine, get_db
from .models import Base
from .schemas import HealthResponse
from .routers import metrics, scores, ai, csf, catalogs


load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Starting NIST CSF 2.0 Metrics API...")
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    print("👋 Shutting down NIST CSF 2.0 Metrics API...")


# Create FastAPI app
app = FastAPI(
    title="NIST CSF 2.0 Cybersecurity Metrics API",
    description="API for managing cybersecurity Key Risk Indicators aligned to NIST Cybersecurity Framework 2.0",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
api_prefix = os.getenv("API_PREFIX", "/api/v1")
app.include_router(metrics.router, prefix=f"{api_prefix}/metrics", tags=["metrics"])
app.include_router(scores.router, prefix=f"{api_prefix}/scores", tags=["scores"])
app.include_router(ai.router, prefix=f"{api_prefix}/ai", tags=["ai"])
app.include_router(csf.router, prefix=f"{api_prefix}")  # CSF router includes its own /csf prefix
app.include_router(catalogs.router, prefix=f"{api_prefix}")  # Catalogs router includes its own /catalogs prefix


@app.get("/", response_model=dict)
async def root():
    """Root endpoint."""
    return {
        "message": "NIST CSF 2.0 Cybersecurity Metrics API",
        "version": "0.1.0",
        "docs_url": "/docs",
        "api_prefix": api_prefix,
    }


@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint."""
    database_connected = True
    ai_service_available = True
    
    try:
        # Test database connection
        db.execute("SELECT 1")
    except Exception:
        database_connected = False
    
    # Test AI service availability (basic check)
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        ai_service_available = bool(openai_key or anthropic_key)
    except Exception:
        ai_service_available = False
    
    status = "healthy" if database_connected else "unhealthy"
    
    return HealthResponse(
        status=status,
        timestamp=datetime.utcnow(),
        database_connected=database_connected,
        ai_service_available=ai_service_available,
    )


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