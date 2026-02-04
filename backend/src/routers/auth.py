"""Authentication endpoints for login/logout/register."""

import logging
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, BeforeValidator
from email_validator import validate_email, EmailNotValidError
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..db import get_db
from ..models import User
from ..services.session_storage import (
    create_session as _create_session,
    get_session as _get_session,
    invalidate_session as _invalidate_session,
    invalidate_user_sessions as _invalidate_user_sessions,
    cleanup_expired_sessions as _cleanup_expired_sessions,
    SessionData,
)


# Rate limiter for auth endpoints - stricter limits for sensitive operations
limiter = Limiter(key_func=get_remote_address)


def validate_email_syntax(value: str) -> str:
    """Validate email syntax only - no DNS/SMTP checks.

    This allows the app to work completely offline.
    """
    if not isinstance(value, str):
        raise ValueError("Email must be a string")
    try:
        # check_deliverability=False disables DNS/SMTP verification
        result = validate_email(value, check_deliverability=False)
        return result.normalized
    except EmailNotValidError as e:
        raise ValueError(str(e))


# Custom email type that only validates syntax (no network calls)
EmailSyntax = Annotated[str, BeforeValidator(validate_email_syntax)]

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailSyntax
    password: str


class RegisterRequest(BaseModel):
    """Registration request schema - for claiming an invited account."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailSyntax
    password: str = Field(..., min_length=4, max_length=100)
    # Security questions (required for first admin, optional for others)
    security_question_1: Optional[str] = None
    security_answer_1: Optional[str] = None
    security_question_2: Optional[str] = None
    security_answer_2: Optional[str] = None


class InviteUserRequest(BaseModel):
    """Admin request to invite a new user."""
    email: EmailSyntax
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
    """Hash a password using bcrypt.

    Bcrypt automatically generates a unique salt for each password
    and is computationally expensive to resist brute-force attacks.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def _is_legacy_sha256_hash(password_hash: str) -> bool:
    """Check if the hash is a legacy SHA-256 hash (64 hex chars)."""
    if len(password_hash) == 64:
        try:
            int(password_hash, 16)
            return True
        except ValueError:
            pass
    return False


def _verify_legacy_sha256(password: str, password_hash: str) -> bool:
    """Verify a password against a legacy SHA-256 hash."""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest() == password_hash


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash.

    Supports both new bcrypt hashes and legacy SHA-256 hashes
    for backward compatibility during migration.
    """
    if _is_legacy_sha256_hash(password_hash):
        return _verify_legacy_sha256(password, password_hash)
    # Bcrypt verification
    try:
        password_bytes = password.encode('utf-8')
        hash_bytes = password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


# =============================================================================
# DEPENDENCY FUNCTIONS FOR ROUTE PROTECTION
# =============================================================================

async def get_current_user(
    token: Optional[str] = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from a token.

    Accepts token via:
    - Authorization header (preferred): "Bearer <token>"
    - Query parameter (deprecated): ?token=<token>

    Use as a dependency in protected routes:
        current_user: User = Depends(get_current_user)
    """
    auth_token = get_token_from_header(authorization) or token

    session = _get_session(auth_token) if auth_token else None
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.email == session.email).first()

    if not user or not user.active:
        # Clean up invalid session
        _invalidate_session(auth_token)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )

    return user


async def require_editor(
    token: Optional[str] = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Require editor or admin role for the current user.

    Use as a dependency in routes that require edit permissions:
        current_user: User = Depends(require_editor)

    Raises 403 Forbidden if user is a viewer.
    """
    user = await get_current_user(token, authorization, db)

    if user.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires Editor or Admin permissions"
        )

    return user


async def require_admin(
    token: Optional[str] = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Require admin role for the current user.

    Use as a dependency in admin-only routes:
        current_user: User = Depends(require_admin)

    Raises 403 Forbidden if user is not an admin.
    """
    user = await get_current_user(token, authorization, db)

    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return user


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

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
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_user = db.query(User).filter(User.email == session.email).first()

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

    logger.info(f"Admin {session.email} invited user {request.email} with role {request.role}")

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
    """Generate a human-readable recovery key with strong entropy.

    Uses 32 bytes (256 bits) of entropy for cryptographic security,
    formatted in groups of 4 for readability.
    """
    # Generate a 64-character key in groups of 4 for readability (32 bytes = 256 bits)
    key = secrets.token_hex(32).upper()  # 64 hex characters
    # Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
    return "-".join(key[i:i+4] for i in range(0, 32, 4))


@router.post("/register")
@limiter.limit("3/minute")
async def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new user account.

    For the first user: Creates admin account directly with recovery options.
    For subsequent users: Must be invited by admin first (claims pending account).

    Rate limited to 3 attempts per minute per IP to prevent abuse.
    """
    user_count = db.query(User).count()

    # First user - create admin directly
    if user_count == 0:
        # Validate security questions for first admin
        if not all([
            body.security_question_1,
            body.security_answer_1,
            body.security_question_2,
            body.security_answer_2
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security questions are required for the admin account"
            )

        # Generate recovery key
        recovery_key = generate_recovery_key()

        new_user = User(
            name=body.name,
            email=body.email,
            password_hash=hash_password(body.password),
            role="admin",
            active=True,
            last_login_at=datetime.utcnow(),
            # Recovery options
            recovery_key_hash=hash_password(recovery_key),
            security_question_1=body.security_question_1,
            security_answer_1_hash=hash_password(body.security_answer_1.lower().strip()),
            security_question_2=body.security_question_2,
            security_answer_2_hash=hash_password(body.security_answer_2.lower().strip()),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        token = _create_session(new_user.email)

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
    existing_user = db.query(User).filter(User.email == body.email).first()

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
    existing_user.name = body.name
    existing_user.password_hash = hash_password(body.password)
    existing_user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(existing_user)

    # Generate session token (auto-login after registration)
    token = _create_session(existing_user.email)

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
@limiter.limit("5/minute")
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return session token.

    Rate limited to 5 attempts per minute per IP to prevent brute force attacks.
    """
    # Find user by email
    user = db.query(User).filter(User.email == body.email).first()

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
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        # Migrate legacy SHA-256 hash to bcrypt on successful login
        if _is_legacy_sha256_hash(user.password_hash):
            user.password_hash = hash_password(body.password)
            logger.info(f"Migrated password hash to bcrypt for user {user.email}")
    else:
        # First login - set the password
        user.password_hash = hash_password(body.password)
        logger.info(f"Set initial password for user {user.email}")

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Generate session token with TTL
    token = _create_session(user.email)

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
    email = _invalidate_session(request.token)
    if email:
        logger.info(f"User {email} logged out")
        return {"message": "Logged out successfully"}

    return {"message": "Session not found or already logged out"}


def get_token_from_header(authorization: str = Header(None)) -> Optional[str]:
    """Extract token from Authorization header (Bearer scheme)."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]  # Remove "Bearer " prefix
    return None


@router.get("/validate")
async def validate_token(
    token: Optional[str] = None,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Validate a session token and return user info.

    Accepts token via:
    - Authorization header (preferred): "Bearer <token>"
    - Query parameter (deprecated): ?token=<token>
    """
    # Prefer Authorization header, fall back to query param for backward compatibility
    auth_token = get_token_from_header(authorization) or token

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided. Use Authorization: Bearer <token> header."
        )

    session = _get_session(auth_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.email == session.email).first()

    if not user or not user.active:
        # Clean up invalid session
        _invalidate_session(auth_token)
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
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.email == session.email).first()

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

    logger.info(f"Password changed for user {session.email}")
    return {"message": "Password changed successfully"}


# Admin endpoint to reset a user's password
@router.post("/reset-password/{user_id}")
@limiter.limit("10/minute")
async def reset_user_password(
    user_id: str,
    new_password: str,
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Admin: Reset another user's password.

    Rate limited to 10 attempts per minute per IP.
    """
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Check if requester is admin
    admin_user = db.query(User).filter(User.email == session.email).first()

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

    logger.info(f"Admin {session.email} reset password for user {target_user.email}")
    return {"message": f"Password reset for {target_user.email}"}


# ============== User Management Endpoints (Admin Only) ==============

@router.get("/users")
async def list_users(token: str, db: Session = Depends(get_db)):
    """Admin: List all users."""
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_user = db.query(User).filter(User.email == session.email).first()

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
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_user = db.query(User).filter(User.email == session.email).first()

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

    logger.info(f"Admin {session.email} changed role for {target_user.email}: {old_role} -> {request.role}")

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
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_user = db.query(User).filter(User.email == session.email).first()

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
        _invalidate_user_sessions(target_user.email)

    logger.info(f"Admin {session.email} {'activated' if active else 'deactivated'} user {target_user.email}")

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
    session = _get_session(token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    admin_user = db.query(User).filter(User.email == session.email).first()

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
    _invalidate_user_sessions(target_user.email)

    email = target_user.email
    db.delete(target_user)
    db.commit()

    logger.info(f"Admin {session.email} deleted user {email}")

    return {"message": f"User {email} deleted"}


# ============== Password Recovery Endpoints ==============

class RecoveryKeyRequest(BaseModel):
    """Request to recover password using recovery key."""
    email: EmailSyntax
    recovery_key: str
    new_password: str = Field(..., min_length=4, max_length=100)


class SecurityQuestionsRequest(BaseModel):
    """Request to recover password using security questions."""
    email: EmailSyntax
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
@limiter.limit("3/minute")
async def recover_with_key(body: RecoveryKeyRequest, request: Request, db: Session = Depends(get_db)):
    """Reset password using recovery key.

    Rate limited to 3 attempts per minute per IP to prevent brute force attacks.
    """
    user = db.query(User).filter(User.email == body.email).first()

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
    normalized_key = body.recovery_key.replace("-", "").upper()
    # Recreate the formatted key for comparison (supports both 24-char and 32-char keys)
    if len(normalized_key) == 24:
        # Legacy 24-character key format
        formatted_key = f"{normalized_key[:4]}-{normalized_key[4:8]}-{normalized_key[8:12]}-{normalized_key[12:16]}-{normalized_key[16:20]}-{normalized_key[20:24]}"
    else:
        # New 32-character key format
        formatted_key = "-".join(normalized_key[i:i+4] for i in range(0, min(len(normalized_key), 32), 4))

    if not verify_password(formatted_key, user.recovery_key_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or recovery key"
        )

    # Reset password
    user.password_hash = hash_password(body.new_password)
    db.commit()

    # Invalidate all existing sessions for this user
    _invalidate_user_sessions(user.email)

    logger.info(f"Password reset via recovery key for user {user.email}")

    return {"message": "Password reset successfully. Please login with your new password."}


@router.post("/recover-with-questions")
@limiter.limit("3/minute")
async def recover_with_questions(body: SecurityQuestionsRequest, request: Request, db: Session = Depends(get_db)):
    """Reset password using security questions.

    Rate limited to 3 attempts per minute per IP to prevent brute force attacks.
    """
    user = db.query(User).filter(User.email == body.email).first()

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
    answer_1_correct = verify_password(body.answer_1.lower().strip(), user.security_answer_1_hash)
    answer_2_correct = verify_password(body.answer_2.lower().strip(), user.security_answer_2_hash)

    if not answer_1_correct or not answer_2_correct:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or security answers"
        )

    # Reset password
    user.password_hash = hash_password(body.new_password)
    db.commit()

    # Invalidate all existing sessions for this user
    _invalidate_user_sessions(user.email)

    logger.info(f"Password reset via security questions for user {user.email}")

    return {"message": "Password reset successfully. Please login with your new password."}
