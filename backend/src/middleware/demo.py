"""Demo mode middleware for restricting write operations.

This middleware intercepts requests from demo users and blocks
write operations (POST, PUT, PATCH, DELETE) on protected endpoints.
"""

import logging
from datetime import datetime, timezone
from typing import Callable, List, Tuple

from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import DemoUser

logger = logging.getLogger(__name__)


class DemoModeMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce demo mode restrictions.

    Demo users (identified by X-Demo-Session header) are blocked from:
    - Creating, updating, or deleting metrics (except via /demo endpoints)
    - Creating, updating, or deleting catalogs
    - Modifying AI provider settings
    - Any other write operations on protected resources
    """

    # Endpoints that demo users CANNOT access with write methods
    # Format: (method, path_prefix)
    RESTRICTED_ENDPOINTS: List[Tuple[str, str]] = [
        # Metrics CRUD (blocked for demo)
        ("POST", "/api/v1/metrics"),
        ("PUT", "/api/v1/metrics"),
        ("PATCH", "/api/v1/metrics"),
        ("DELETE", "/api/v1/metrics"),

        # Catalogs (blocked for demo)
        ("POST", "/api/v1/catalogs"),
        ("PUT", "/api/v1/catalogs"),
        ("PATCH", "/api/v1/catalogs"),
        ("DELETE", "/api/v1/catalogs"),

        # AI providers configuration (blocked for demo)
        ("POST", "/api/v1/ai-providers/configurations"),
        ("PUT", "/api/v1/ai-providers/configurations"),
        ("PATCH", "/api/v1/ai-providers/configurations"),
        ("DELETE", "/api/v1/ai-providers/configurations"),

        # AI actions (blocked for demo - they can chat but not apply changes)
        ("POST", "/api/v1/ai/actions/apply"),
    ]

    # Endpoints that demo users CAN access even with write methods
    # These are demo-specific endpoints
    ALLOWED_DEMO_ENDPOINTS: List[str] = [
        "/api/v1/demo/",
        "/api/v1/ai/chat",  # Allow AI chat (read-only conversation)
        "/api/v1/ai/recommendations",  # Allow viewing recommendations
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and enforce demo restrictions."""

        # Get demo session header
        demo_session = request.headers.get("X-Demo-Session")

        if not demo_session:
            # Not a demo user, allow all operations
            return await call_next(request)

        # Validate demo session
        db = SessionLocal()
        try:
            demo_user = db.query(DemoUser).filter(
                DemoUser.session_id == demo_session
            ).first()

            if not demo_user:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid demo session"},
                )

            # Check if demo has expired
            if demo_user.expired:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Demo session has expired"},
                )

            if demo_user.demo_expires_at:
                if datetime.now(timezone.utc) > demo_user.demo_expires_at:
                    # Mark as expired
                    demo_user.expired = True
                    db.commit()
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Demo session has expired"},
                    )

            # Check if demo has been started
            if not demo_user.demo_started_at:
                # Only allow access to demo session endpoints
                if not request.url.path.startswith("/api/v1/demo/"):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Demo not started. Please complete onboarding first."},
                    )

            # Set demo state on request for downstream handlers
            request.state.is_demo = True
            request.state.demo_user = demo_user

            # Check if this is a restricted endpoint
            if self._is_restricted(request):
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "This action is not available in demo mode. "
                                  "Sign up for full access to create and modify metrics."
                    },
                )

        finally:
            db.close()

        # Continue with request
        response = await call_next(request)
        return response

    def _is_restricted(self, request: Request) -> bool:
        """Check if request is to a restricted endpoint."""
        method = request.method.upper()
        path = request.url.path

        # First check if it's an allowed demo endpoint
        for allowed_prefix in self.ALLOWED_DEMO_ENDPOINTS:
            if path.startswith(allowed_prefix):
                return False

        # Then check if it matches a restricted pattern
        for restricted_method, restricted_prefix in self.RESTRICTED_ENDPOINTS:
            if method == restricted_method and path.startswith(restricted_prefix):
                logger.info(f"Demo user blocked from {method} {path}")
                return True

        return False
