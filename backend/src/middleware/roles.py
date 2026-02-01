"""Role-based access control utilities.

Provides FastAPI dependencies for enforcing user roles on endpoints.
Users are identified via X-User-Email header (no password auth).
Roles: viewer (read-only), editor (read/write), admin (full access).
"""

import logging
from typing import List, Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User

logger = logging.getLogger(__name__)


class UserRole:
    """User role constants."""
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"

    ALL = ["viewer", "editor", "admin"]


def get_current_user(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get current user from X-User-Email header.

    Returns None if no header is provided. Does not enforce any role.
    Use this for endpoints that optionally benefit from user context.
    """
    if not x_user_email:
        return None
    return (
        db.query(User)
        .filter(User.email == x_user_email, User.active == True)
        .first()
    )


def require_role(allowed_roles: List[str]):
    """Dependency factory: require user has one of the specified roles.

    Usage in endpoint signatures:
        current_user: User = Depends(require_role(["admin"]))
        current_user: User = Depends(require_role(["editor", "admin"]))

    Raises:
        HTTPException 401: If user not found or inactive.
        HTTPException 403: If user's role is not in allowed_roles.
    """
    def dependency(
        x_user_email: str = Header(..., alias="X-User-Email"),
        db: Session = Depends(get_db),
    ) -> User:
        logger.info(f"🔐 Auth check: email={x_user_email!r}, required_roles={allowed_roles}")
        user = (
            db.query(User)
            .filter(User.email == x_user_email, User.active == True)
            .first()
        )
        if not user:
            logger.warning(f"🔐 User not found: {x_user_email!r}")
            raise HTTPException(
                status_code=401,
                detail="User not found or inactive",
            )
        logger.info(f"🔐 User found: {user.email!r}, role={user.role!r}")
        if user.role not in allowed_roles:
            logger.warning(f"🔐 Permission denied: user role {user.role!r} not in {allowed_roles}")
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required role: {allowed_roles}",
            )
        return user

    return dependency


# Convenience dependency factories for common role combinations.
# Usage: current_user: User = Depends(require_admin())
def require_admin():
    """Require admin role."""
    return require_role([UserRole.ADMIN])


def require_editor():
    """Require editor or admin role."""
    return require_role([UserRole.EDITOR, UserRole.ADMIN])


def require_viewer():
    """Require any authenticated role (viewer, editor, or admin)."""
    return require_role([UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN])
