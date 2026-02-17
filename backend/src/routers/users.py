"""API endpoints for user management.

Admin-assigned roles (viewer, editor, admin) with token-based authentication.
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..db import get_db
from ..models import User
from .auth import get_current_user, require_admin

VALID_ROLES = ["viewer", "editor", "admin"]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


# ==============================================================================
# PYDANTIC MODELS (inline to avoid shared file conflicts)
# These will be moved to schemas.py via the scratchpad manifest
# ==============================================================================

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class UserCreateRequest(BaseModel):
    """Schema for creating a new user."""
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    role: str = Field("viewer", max_length=50)


class UserUpdateRequest(BaseModel):
    """Schema for updating a user."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, min_length=3, max_length=255)
    role: Optional[str] = Field(None, max_length=50)
    active: Optional[bool] = None


class UserRoleAssignRequest(BaseModel):
    """Schema for assigning a role to a user."""
    role: str = Field(..., max_length=50)


class UserResponse(BaseModel):
    """Schema for user API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = True
    selected_framework_id: Optional[UUID] = None
    onboarding_completed: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==============================================================================
# ENDPOINTS
# ==============================================================================


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Get the current user's profile.

    No role requirement - any authenticated user can access their own profile.
    """
    return UserResponse.model_validate(current_user)


@router.get("/", response_model=List[UserResponse])
async def list_users(
    active_only: bool = Query(False, description="Filter to active users only"),
    role: Optional[str] = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all users. Requires admin role."""
    query = db.query(User)

    if active_only:
        query = query.filter(User.active == True)

    if role:
        if role not in VALID_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role filter. Must be one of: {VALID_ROLES}",
            )
        query = query.filter(User.role == role)

    users = query.order_by(User.name).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create a new user. Requires admin role."""
    # Validate role
    if user_data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{user_data.role}'. Must be one of: {VALID_ROLES}",
        )

    # Check for duplicate email
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A user with email '{user_data.email}' already exists.",
        )

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        role=user_data.role,
        active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Created user: {new_user.email} with role: {new_user.role}")
    return UserResponse.model_validate(new_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get a user by ID. Requires admin role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update a user's fields. Requires admin role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_fields = user_data.model_dump(exclude_unset=True)

    # Validate role if being updated
    if "role" in update_fields and update_fields["role"] not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{update_fields['role']}'. Must be one of: {VALID_ROLES}",
        )

    # Check email uniqueness if being updated
    if "email" in update_fields and update_fields["email"] != user.email:
        existing = db.query(User).filter(
            and_(User.email == update_fields["email"], User.id != user_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"A user with email '{update_fields['email']}' already exists.",
            )

    for field, value in update_fields.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    logger.info(f"Updated user: {user.email}")
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Soft delete a user (set active=False). Requires admin role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deactivating yourself
    if _admin.id == user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account.",
        )

    user.active = False
    db.commit()

    logger.info(f"Deactivated user: {user.email}")
    return {"message": f"User '{user.email}' has been deactivated."}


@router.put("/{user_id}/role", response_model=UserResponse)
async def assign_role(
    user_id: UUID,
    role_data: UserRoleAssignRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Assign a role to a user. Requires admin role."""
    if role_data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role_data.role}'. Must be one of: {VALID_ROLES}",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = role_data.role
    db.commit()
    db.refresh(user)

    logger.info(f"Changed role for {user.email}: {old_role} -> {user.role}")
    return UserResponse.model_validate(user)
