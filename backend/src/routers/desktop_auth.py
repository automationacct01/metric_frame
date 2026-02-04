"""Desktop-only authentication router.

Provides simplified authentication for the desktop app with two modes:
1. Password protection - Simple password + security questions for recovery
2. No authentication - Direct access to the app

This router is only active when METRICFRAME_DESKTOP_MODE=true.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..db import get_db, IS_DESKTOP_MODE
from ..models import DesktopConfig
from .auth import hash_password, verify_password
from ..services.session_storage import create_session, invalidate_session

router = APIRouter(prefix="/auth/desktop", tags=["desktop-auth"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class DesktopStatusResponse(BaseModel):
    """Response from /auth/desktop/status"""
    setup_completed: bool
    auth_mode: str  # 'password' | 'none'
    is_desktop_mode: bool


class DesktopSetupRequest(BaseModel):
    """Request for /auth/desktop/setup"""
    auth_mode: str  # 'password' | 'none'
    password: Optional[str] = None
    security_question_1: Optional[str] = None
    security_answer_1: Optional[str] = None
    security_question_2: Optional[str] = None
    security_answer_2: Optional[str] = None


class DesktopSetupResponse(BaseModel):
    """Response from /auth/desktop/setup"""
    message: str
    auth_mode: str


class DesktopValidateRequest(BaseModel):
    """Request for /auth/desktop/validate"""
    password: str


class DesktopValidateResponse(BaseModel):
    """Response from /auth/desktop/validate"""
    valid: bool
    token: str


class DesktopRecoveryQuestionsResponse(BaseModel):
    """Response from /auth/desktop/recovery-questions"""
    question_1: str
    question_2: str


class DesktopRecoverRequest(BaseModel):
    """Request for /auth/desktop/recover"""
    answer_1: str
    answer_2: str
    new_password: str


class DesktopChangeModeRequest(BaseModel):
    """Request for /auth/desktop/change-mode"""
    new_mode: str  # 'password' | 'none'
    current_password: Optional[str] = None  # Required if current mode is 'password'
    new_password: Optional[str] = None  # Required if new mode is 'password'
    security_question_1: Optional[str] = None
    security_answer_1: Optional[str] = None
    security_question_2: Optional[str] = None
    security_answer_2: Optional[str] = None


class DesktopChangePasswordRequest(BaseModel):
    """Request for /auth/desktop/change-password"""
    current_password: str
    new_password: str


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def require_desktop_mode():
    """Dependency to ensure we're in desktop mode."""
    if not IS_DESKTOP_MODE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Desktop endpoints not available in this deployment"
        )


def get_desktop_config(db: Session) -> Optional[DesktopConfig]:
    """Get the desktop configuration (single row)."""
    return db.query(DesktopConfig).first()


def create_or_get_config(db: Session) -> DesktopConfig:
    """Get existing config or create a new one."""
    config = get_desktop_config(db)
    if not config:
        config = DesktopConfig(id=1)
        db.add(config)
    return config


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/status", response_model=DesktopStatusResponse)
async def get_desktop_status(
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Check desktop setup status and auth mode.

    Returns whether setup is completed and the current auth mode.
    Used by frontend to determine which screen to show.
    """
    config = get_desktop_config(db)
    return DesktopStatusResponse(
        setup_completed=config.setup_completed if config else False,
        auth_mode=config.auth_mode if config else "none",
        is_desktop_mode=True
    )


@router.post("/setup", response_model=DesktopSetupResponse)
async def setup_desktop_auth(
    request: DesktopSetupRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Initial desktop setup - choose password protection or no auth.

    This should only be called once on first launch.
    """
    config = get_desktop_config(db)
    if config and config.setup_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desktop already configured. Use change-mode to modify."
        )

    # Validate request based on auth mode
    if request.auth_mode not in ('password', 'none'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="auth_mode must be 'password' or 'none'"
        )

    if request.auth_mode == 'password':
        if not request.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password required when auth_mode is 'password'"
            )
        if len(request.password) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 4 characters"
            )
        if not all([
            request.security_question_1,
            request.security_answer_1,
            request.security_question_2,
            request.security_answer_2
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both security questions and answers are required"
            )

    # Create or update config
    config = create_or_get_config(db)
    config.auth_mode = request.auth_mode
    config.setup_completed = True

    if request.auth_mode == 'password':
        config.password_hash = hash_password(request.password)
        config.security_question_1 = request.security_question_1.strip()
        config.security_answer_1_hash = hash_password(request.security_answer_1.lower().strip())
        config.security_question_2 = request.security_question_2.strip()
        config.security_answer_2_hash = hash_password(request.security_answer_2.lower().strip())
    else:
        # Clear any password data for 'none' mode
        config.password_hash = None
        config.security_question_1 = None
        config.security_answer_1_hash = None
        config.security_question_2 = None
        config.security_answer_2_hash = None

    db.commit()

    return DesktopSetupResponse(
        message="Desktop configured successfully",
        auth_mode=request.auth_mode
    )


@router.post("/validate", response_model=DesktopValidateResponse)
async def validate_desktop_password(
    request: DesktopValidateRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Validate password and create session token.

    Only works if auth_mode is 'password'.
    """
    config = get_desktop_config(db)
    if not config or not config.setup_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desktop not configured. Run setup first."
        )

    if config.auth_mode != 'password':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not enabled"
        )

    if not config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password not configured correctly"
        )

    if not verify_password(request.password, config.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Create session token for desktop user
    token = create_session("desktop_user@local")

    return DesktopValidateResponse(valid=True, token=token)


@router.get("/recovery-questions", response_model=DesktopRecoveryQuestionsResponse)
async def get_recovery_questions(
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Get security questions for password recovery.

    Only available if auth_mode is 'password'.
    """
    config = get_desktop_config(db)
    if not config or config.auth_mode != 'password':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not enabled"
        )

    if not config.security_question_1 or not config.security_question_2:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Security questions not configured"
        )

    return DesktopRecoveryQuestionsResponse(
        question_1=config.security_question_1,
        question_2=config.security_question_2
    )


@router.post("/recover")
async def recover_password(
    request: DesktopRecoverRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Reset password using security question answers."""
    config = get_desktop_config(db)
    if not config or config.auth_mode != 'password':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not enabled"
        )

    # Verify both security answers
    answer_1_valid = verify_password(
        request.answer_1.lower().strip(),
        config.security_answer_1_hash
    )
    answer_2_valid = verify_password(
        request.answer_2.lower().strip(),
        config.security_answer_2_hash
    )

    if not (answer_1_valid and answer_2_valid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect security answers"
        )

    # Validate new password
    if len(request.new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters"
        )

    # Update password
    config.password_hash = hash_password(request.new_password)
    db.commit()

    return {"message": "Password reset successfully"}


@router.put("/change-mode")
async def change_auth_mode(
    request: DesktopChangeModeRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Change authentication mode (password <-> none)."""
    config = get_desktop_config(db)
    if not config or not config.setup_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desktop not configured"
        )

    if request.new_mode not in ('password', 'none'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new_mode must be 'password' or 'none'"
        )

    # If switching from password mode, verify current password
    if config.auth_mode == 'password':
        if not request.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password required to change mode"
            )
        if not verify_password(request.current_password, config.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid current password"
            )

    # If switching to password mode, require new password and questions
    if request.new_mode == 'password':
        if not request.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password required"
            )
        if len(request.new_password) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 4 characters"
            )
        if not all([
            request.security_question_1,
            request.security_answer_1,
            request.security_question_2,
            request.security_answer_2
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security questions and answers required"
            )

        config.password_hash = hash_password(request.new_password)
        config.security_question_1 = request.security_question_1.strip()
        config.security_answer_1_hash = hash_password(request.security_answer_1.lower().strip())
        config.security_question_2 = request.security_question_2.strip()
        config.security_answer_2_hash = hash_password(request.security_answer_2.lower().strip())
    else:
        # Switching to 'none' mode - clear password data
        config.password_hash = None
        config.security_question_1 = None
        config.security_answer_1_hash = None
        config.security_question_2 = None
        config.security_answer_2_hash = None

    config.auth_mode = request.new_mode
    db.commit()

    return {"message": f"Authentication mode changed to '{request.new_mode}'"}


@router.put("/change-password")
async def change_password(
    request: DesktopChangePasswordRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_desktop_mode)
):
    """Change existing password (requires current password)."""
    config = get_desktop_config(db)
    if not config or config.auth_mode != 'password':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password authentication not enabled"
        )

    # Verify current password
    if not verify_password(request.current_password, config.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid current password"
        )

    # Validate new password
    if len(request.new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters"
        )

    # Update password
    config.password_hash = hash_password(request.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
