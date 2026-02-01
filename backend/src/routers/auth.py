"""Authentication endpoints for login/logout/register."""

import hashlib
import secrets
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from ..db import get_db
from ..models import User

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


# Simple in-memory session store (for local app)
# This is fine for a local desktop/docker application
_sessions: dict[str, str] = {}  # token -> email


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Registration request schema - for claiming an invited account."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=4, max_length=100)
    # Security questions (required for first admin, optional for others)
    security_question_1: Optional[str] = None
    security_answer_1: Optional[str] = None
    security_question_2: Optional[str] = None
    security_answer_2: Optional[str] = None


class InviteUserRequest(BaseModel):
    """Admin request to invite a new user."""
    email: EmailStr
    role: str = Field(default="viewer", pattern="^(admin|editor|viewer)$")


class LoginResponse(BaseModel):
    """Login response schema."""
    token: str
    user: dict


class RegisterResponse(BaseModel):
    """Registration response schema."""
    token: str
    user: dict
    message: str


class LogoutRequest(BaseModel):
    """Logout request schema."""
    token: str


class AuthStatusResponse(BaseModel):
    """Auth status response schema."""
    has_users: bool
    user_count: int


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 (simple approach for local app)."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return hash_password(password) == password_hash


def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(db: Session = Depends(get_db)):
    """Check if any users exist in the system.

    Used by frontend to determine whether to show login or registration.
    """
    user_count = db.query(User).filter(User.active == True).count()
    return AuthStatusResponse(
        has_users=user_count > 0,
        user_count=user_count
    )


@router.post("/invite")
async def invite_user(request: InviteUserRequest, token: str, db: Session = Depends(get_db)):
    """Admin: Invite a new user by email with assigned role.

    Creates a pending user account that the user can claim by registering.
    """
    # Verify admin token
    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_email = _sessions[token]
    admin_user = db.query(User).filter(User.email == admin_email).first()

    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    # Create invited user (no password yet - pending registration)
    new_user = User(
        name="",  # Will be set during registration
        email=request.email,
        password_hash=None,  # No password until they register
        role=request.role,
        active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Admin {admin_email} invited user {request.email} with role {request.role}")

    return {
        "message": f"User {request.email} invited as {request.role}",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "role": new_user.role,
            "pending": True
        }
    }


def generate_recovery_key() -> str:
    """Generate a human-readable recovery key."""
    # Generate a 24-character key in groups of 4 for readability
    key = secrets.token_hex(12).upper()  # 24 hex characters
    return f"{key[:4]}-{key[4:8]}-{key[8:12]}-{key[12:16]}-{key[16:20]}-{key[20:24]}"


@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account.

    For the first user: Creates admin account directly with recovery options.
    For subsequent users: Must be invited by admin first (claims pending account).
    """
    user_count = db.query(User).count()

    # First user - create admin directly
    if user_count == 0:
        # Validate security questions for first admin
        if not all([
            request.security_question_1,
            request.security_answer_1,
            request.security_question_2,
            request.security_answer_2
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security questions are required for the admin account"
            )

        # Generate recovery key
        recovery_key = generate_recovery_key()

        new_user = User(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password),
            role="admin",
            active=True,
            last_login_at=datetime.utcnow(),
            # Recovery options
            recovery_key_hash=hash_password(recovery_key),
            security_question_1=request.security_question_1,
            security_answer_1_hash=hash_password(request.security_answer_1.lower().strip()),
            security_question_2=request.security_question_2,
            security_answer_2_hash=hash_password(request.security_answer_2.lower().strip()),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = generate_token()
        _sessions[token] = new_user.email

        logger.info(f"First user registered as admin: {new_user.email}")

        return {
            "token": token,
            "user": {
                "id": str(new_user.id),
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role,
                "active": new_user.active,
            },
            "message": "Admin account created successfully",
            "recovery_key": recovery_key  # Only returned once!
        }

    # Subsequent users - must claim an invited account
    existing_user = db.query(User).filter(User.email == request.email).first()

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No invitation found for this email. Please contact an administrator."
        )

    if existing_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has already been registered. Please login instead."
        )

    # Claim the invited account
    existing_user.name = request.name
    existing_user.password_hash = hash_password(request.password)
    existing_user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(existing_user)

    # Generate session token (auto-login after registration)
    token = generate_token()
    _sessions[token] = existing_user.email

    logger.info(f"User {existing_user.email} completed registration with role {existing_user.role}")

    return RegisterResponse(
        token=token,
        user={
            "id": str(existing_user.id),
            "name": existing_user.name,
            "email": existing_user.email,
            "role": existing_user.role,
            "active": existing_user.active,
        },
        message=f"Account activated successfully as {existing_user.role}"
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return session token."""

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )

    # Check password
    # If no password hash set, allow any password (for initial setup/demo)
    if user.password_hash:
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
    else:
        # First login - set the password
        user.password_hash = hash_password(request.password)
        logger.info(f"Set initial password for user {user.email}")

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Generate session token
    token = generate_token()
    _sessions[token] = user.email

    logger.info(f"User {user.email} logged in successfully")

    return LoginResponse(
        token=token,
        user={
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "active": user.active,
        }
    )


@router.post("/logout")
async def logout(request: LogoutRequest):
    """Invalidate session token."""

    if request.token in _sessions:
        email = _sessions.pop(request.token)
        logger.info(f"User {email} logged out")
        return {"message": "Logged out successfully"}

    return {"message": "Session not found or already logged out"}


@router.get("/validate")
async def validate_token(token: str, db: Session = Depends(get_db)):
    """Validate a session token and return user info."""

    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    email = _sessions[token]
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.active:
        # Clean up invalid session
        _sessions.pop(token, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )

    return {
        "valid": True,
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "active": user.active,
        }
    }


@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    token: str,
    db: Session = Depends(get_db)
):
    """Change user's password."""

    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    email = _sessions[token]
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify current password (skip if no password set)
    if user.password_hash and not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Set new password
    user.password_hash = hash_password(new_password)
    db.commit()

    logger.info(f"Password changed for user {email}")
    return {"message": "Password changed successfully"}


# Admin endpoint to reset a user's password
@router.post("/reset-password/{user_id}")
async def reset_user_password(
    user_id: str,
    new_password: str,
    token: str,
    db: Session = Depends(get_db)
):
    """Admin: Reset another user's password."""

    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Check if requester is admin
    admin_email = _sessions[token]
    admin_user = db.query(User).filter(User.email == admin_email).first()

    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Find target user
    target_user = db.query(User).filter(User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Set new password
    target_user.password_hash = hash_password(new_password)
    db.commit()

    logger.info(f"Admin {admin_email} reset password for user {target_user.email}")
    return {"message": f"Password reset for {target_user.email}"}


# ============== User Management Endpoints (Admin Only) ==============

@router.get("/users")
async def list_users(token: str, db: Session = Depends(get_db)):
    """Admin: List all users."""
    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_email = _sessions[token]
    admin_user = db.query(User).filter(User.email == admin_email).first()

    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    users = db.query(User).order_by(User.created_at.desc()).all()

    return {
        "users": [
            {
                "id": str(u.id),
                "name": u.name or "",
                "email": u.email,
                "role": u.role,
                "active": u.active,
                "pending": u.password_hash is None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


class UpdateUserRoleRequest(BaseModel):
    """Request to update user role."""
    role: str = Field(..., pattern="^(admin|editor|viewer)$")


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    request: UpdateUserRoleRequest,
    token: str,
    db: Session = Depends(get_db)
):
    """Admin: Update a user's role."""
    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_email = _sessions[token]
    admin_user = db.query(User).filter(User.email == admin_email).first()

    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from demoting themselves if they're the only admin
    if str(target_user.id) == str(admin_user.id) and request.role != "admin":
        admin_count = db.query(User).filter(User.role == "admin", User.active == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the only admin"
            )

    old_role = target_user.role
    target_user.role = request.role
    db.commit()

    logger.info(f"Admin {admin_email} changed role for {target_user.email}: {old_role} -> {request.role}")

    return {
        "message": f"Role updated to {request.role}",
        "user": {
            "id": str(target_user.id),
            "email": target_user.email,
            "role": target_user.role
        }
    }


@router.put("/users/{user_id}/active")
async def update_user_active(
    user_id: str,
    active: bool,
    token: str,
    db: Session = Depends(get_db)
):
    """Admin: Activate or deactivate a user."""
    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_email = _sessions[token]
    admin_user = db.query(User).filter(User.email == admin_email).first()

    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from deactivating themselves
    if str(target_user.id) == str(admin_user.id) and not active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    target_user.active = active
    db.commit()

    # Invalidate sessions for deactivated user
    if not active:
        tokens_to_remove = [t for t, email in _sessions.items() if email == target_user.email]
        for t in tokens_to_remove:
            _sessions.pop(t, None)

    logger.info(f"Admin {admin_email} {'activated' if active else 'deactivated'} user {target_user.email}")

    return {
        "message": f"User {'activated' if active else 'deactivated'}",
        "user": {
            "id": str(target_user.id),
            "email": target_user.email,
            "active": target_user.active
        }
    }


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, token: str, db: Session = Depends(get_db)):
    """Admin: Delete a user."""
    if token not in _sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_email = _sessions[token]
    admin_user = db.query(User).filter(User.email == admin_email).first()

    if not admin_user or admin_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from deleting themselves
    if str(target_user.id) == str(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Invalidate sessions for deleted user
    tokens_to_remove = [t for t, email in _sessions.items() if email == target_user.email]
    for t in tokens_to_remove:
        _sessions.pop(t, None)

    email = target_user.email
    db.delete(target_user)
    db.commit()

    logger.info(f"Admin {admin_email} deleted user {email}")

    return {"message": f"User {email} deleted"}


# ============== Password Recovery Endpoints ==============

class RecoveryKeyRequest(BaseModel):
    """Request to recover password using recovery key."""
    email: EmailStr
    recovery_key: str
    new_password: str = Field(..., min_length=4, max_length=100)


class SecurityQuestionsRequest(BaseModel):
    """Request to recover password using security questions."""
    email: EmailStr
    answer_1: str
    answer_2: str
    new_password: str = Field(..., min_length=4, max_length=100)


@router.get("/recovery-questions/{email}")
async def get_recovery_questions(email: str, db: Session = Depends(get_db)):
    """Get security questions for a user (to display in recovery form)."""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Don't reveal if user exists or not
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No recovery options found for this email"
        )

    if not user.security_question_1 or not user.security_question_2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No security questions configured for this account"
        )

    return {
        "email": email,
        "question_1": user.security_question_1,
        "question_2": user.security_question_2
    }


@router.post("/recover-with-key")
async def recover_with_key(request: RecoveryKeyRequest, db: Session = Depends(get_db)):
    """Reset password using recovery key."""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or recovery key"
        )

    if not user.recovery_key_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recovery key configured for this account"
        )

    # Normalize the recovery key (remove dashes, uppercase)
    normalized_key = request.recovery_key.replace("-", "").upper()
    # Recreate the formatted key for comparison
    formatted_key = f"{normalized_key[:4]}-{normalized_key[4:8]}-{normalized_key[8:12]}-{normalized_key[12:16]}-{normalized_key[16:20]}-{normalized_key[20:24]}"

    if not verify_password(formatted_key, user.recovery_key_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or recovery key"
        )

    # Reset password
    user.password_hash = hash_password(request.new_password)
    db.commit()

    # Invalidate all existing sessions for this user
    tokens_to_remove = [t for t, email in _sessions.items() if email == user.email]
    for t in tokens_to_remove:
        _sessions.pop(t, None)

    logger.info(f"Password reset via recovery key for user {user.email}")

    return {"message": "Password reset successfully. Please login with your new password."}


@router.post("/recover-with-questions")
async def recover_with_questions(request: SecurityQuestionsRequest, db: Session = Depends(get_db)):
    """Reset password using security questions."""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or security answers"
        )

    if not user.security_answer_1_hash or not user.security_answer_2_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No security questions configured for this account"
        )

    # Verify answers (case-insensitive, trimmed)
    answer_1_correct = verify_password(request.answer_1.lower().strip(), user.security_answer_1_hash)
    answer_2_correct = verify_password(request.answer_2.lower().strip(), user.security_answer_2_hash)

    if not answer_1_correct or not answer_2_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or security answers"
        )

    # Reset password
    user.password_hash = hash_password(request.new_password)
    db.commit()

    # Invalidate all existing sessions for this user
    tokens_to_remove = [t for t, email in _sessions.items() if email == user.email]
    for t in tokens_to_remove:
        _sessions.pop(t, None)

    logger.info(f"Password reset via security questions for user {user.email}")

    return {"message": "Password reset successfully. Please login with your new password."}
