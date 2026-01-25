"""Demo mode API endpoints.

Provides endpoints for demo session management, limited metrics access,
and AI metric creation with quota enforcement.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ..db import get_db
from ..models import (
    DemoUser,
    DemoMetric,
    Metric,
    Framework,
    FrameworkFunction,
    FrameworkCategory,
)
from ..schemas import (
    DemoSessionCreate,
    DemoSessionStart,
    DemoSessionResponse,
    DemoQuotas,
    DemoMetricCreate,
    DemoMetricResponse,
    DemoMetricsListResponse,
    MetricResponse,
    DemoGuidedChatRequest,
    DemoGuidedChatResponse,
    DemoAIChatStatusResponse,
    DemoStarterOption,
    DemoRefinementOption,
)
from ..services.scoring import compute_metric_score, compute_gap_to_target

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])

# Demo configuration
DEMO_DURATION_HOURS = 24
AI_METRICS_QUOTA_PER_FRAMEWORK = 2
MAX_DEMO_CHAT_INTERACTIONS = 6  # 3 per framework (starter + refinement + confirm)
MAX_INVALID_REQUESTS_BEFORE_LOCK = 10

# ==============================================================================
# Demo AI Chat Starters Configuration
# ==============================================================================

# Pre-defined starters for CSF 2.0
CSF_DEMO_STARTERS = {
    "csf-mfa": {
        "id": "csf-mfa",
        "label": "MFA Coverage Metric",
        "description": "Track multi-factor authentication adoption across your organization",
        "icon": "security",
        "category": "PR.AA",
        "prompt": "Create a metric to track MFA (Multi-Factor Authentication) coverage across our organization",
    },
    "csf-mttd": {
        "id": "csf-mttd",
        "label": "Mean Time to Detect",
        "description": "Measure how quickly security incidents are detected",
        "icon": "timer",
        "category": "DE.AE",
        "prompt": "Create a metric to measure our Mean Time to Detect (MTTD) security incidents",
    },
}

# Pre-defined starters for AI RMF
AI_RMF_DEMO_STARTERS = {
    "ai-bias": {
        "id": "ai-bias",
        "label": "AI Bias Detection Rate",
        "description": "Track bias detection and mitigation in AI systems",
        "icon": "balance",
        "category": "MEASURE-2",
        "prompt": "Create a metric to track bias detection and mitigation in our AI systems",
    },
    "ai-explainability": {
        "id": "ai-explainability",
        "label": "AI Explainability Score",
        "description": "Measure the explainability of AI model decisions",
        "icon": "visibility",
        "category": "GOVERN-4",
        "prompt": "Create a metric to measure the explainability of our AI model decisions",
    },
}

# All allowed starters (for validation)
ALLOWED_DEMO_STARTERS = {**CSF_DEMO_STARTERS, **AI_RMF_DEMO_STARTERS}

# Pre-defined refinement options
DEMO_REFINEMENTS = {
    "adjust-target-higher": {
        "id": "adjust-target-higher",
        "label": "Increase Target",
        "description": "Set a more ambitious target value",
    },
    "adjust-target-lower": {
        "id": "adjust-target-lower",
        "label": "Lower Target",
        "description": "Set a more achievable target value",
    },
    "change-frequency-weekly": {
        "id": "change-frequency-weekly",
        "label": "Weekly Collection",
        "description": "Collect this metric weekly",
    },
    "change-frequency-monthly": {
        "id": "change-frequency-monthly",
        "label": "Monthly Collection",
        "description": "Collect this metric monthly",
    },
}


def _get_starters_for_framework(framework: str) -> list:
    """Get demo starters for a specific framework."""
    if framework == "csf_2_0":
        return [
            DemoStarterOption(
                id=s["id"],
                label=s["label"],
                description=s["description"],
                icon=s.get("icon"),
                category=s["category"],
            )
            for s in CSF_DEMO_STARTERS.values()
        ]
    else:
        return [
            DemoStarterOption(
                id=s["id"],
                label=s["label"],
                description=s["description"],
                icon=s.get("icon"),
                category=s["category"],
            )
            for s in AI_RMF_DEMO_STARTERS.values()
        ]


def _get_refinements() -> list:
    """Get all available refinement options."""
    return [
        DemoRefinementOption(
            id=r["id"],
            label=r["label"],
            description=r["description"],
        )
        for r in DEMO_REFINEMENTS.values()
    ]


# Import demo category configuration
from ..seeds.demo_metrics_config import (
    DEMO_CSF_2_0_CATEGORIES as DEMO_CSF_CATEGORIES,
    DEMO_AI_RMF_CATEGORIES,
    get_demo_categories,
)


def _generate_session_id() -> str:
    """Generate a secure random session ID."""
    return secrets.token_urlsafe(32)


def _get_demo_user(session_id: str, db: Session) -> Optional[DemoUser]:
    """Get demo user by session ID."""
    return db.query(DemoUser).filter(DemoUser.session_id == session_id).first()


def _build_quotas(demo_user: DemoUser) -> DemoQuotas:
    """Build quotas object from demo user."""
    return DemoQuotas(
        csf_metrics_created=demo_user.ai_metrics_created_csf,
        csf_metrics_max=AI_METRICS_QUOTA_PER_FRAMEWORK,
        ai_rmf_metrics_created=demo_user.ai_metrics_created_ai_rmf,
        ai_rmf_metrics_max=AI_METRICS_QUOTA_PER_FRAMEWORK,
    )


def _build_session_response(demo_user: DemoUser) -> DemoSessionResponse:
    """Build session response from demo user."""
    return DemoSessionResponse(
        id=demo_user.id,
        session_id=demo_user.session_id,
        email=demo_user.email,
        video_skipped=demo_user.video_skipped,
        demo_started_at=demo_user.demo_started_at,
        demo_expires_at=demo_user.demo_expires_at,
        expired=demo_user.is_expired,
        quotas=_build_quotas(demo_user),
        created_at=demo_user.created_at,
    )


def _add_scores_to_response(metric: Metric) -> MetricResponse:
    """Create MetricResponse with computed scores."""
    response = MetricResponse.model_validate(metric)
    score = compute_metric_score(metric)
    response.metric_score = score * 100 if score is not None else None
    response.gap_to_target = compute_gap_to_target(metric)
    return response


async def get_demo_session(
    x_demo_session: Optional[str] = Header(None, alias="X-Demo-Session"),
    db: Session = Depends(get_db),
) -> Optional[DemoUser]:
    """Dependency to get current demo session from header."""
    if not x_demo_session:
        return None
    return _get_demo_user(x_demo_session, db)


async def require_demo_session(
    x_demo_session: str = Header(..., alias="X-Demo-Session"),
    db: Session = Depends(get_db),
) -> DemoUser:
    """Dependency to require valid demo session."""
    demo_user = _get_demo_user(x_demo_session, db)
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid demo session",
        )
    if demo_user.is_expired:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo session has expired",
        )
    if not demo_user.demo_started_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo not started. Please complete onboarding first.",
        )
    return demo_user


# ==============================================================================
# Session Management Endpoints
# ==============================================================================

@router.post("/session", response_model=DemoSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_demo_session(
    request: Request,
    data: DemoSessionCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new demo session.

    Requires email for lead capture. Returns session ID to be used
    in X-Demo-Session header for subsequent requests.
    """
    # Check if email already has an active demo
    existing = db.query(DemoUser).filter(
        DemoUser.email == data.email,
        DemoUser.expired == False,
    ).first()

    if existing and not existing.is_expired:
        # Return existing session
        return _build_session_response(existing)

    # Create new demo user
    demo_user = DemoUser(
        session_id=_generate_session_id(),
        email=data.email,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )

    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    logger.info(f"Created demo session for email: {data.email}")
    return _build_session_response(demo_user)


@router.post("/session/{session_id}/start", response_model=DemoSessionResponse)
async def start_demo(
    session_id: str,
    data: DemoSessionStart,
    db: Session = Depends(get_db),
):
    """
    Start the demo session after video/onboarding.

    Sets the 24-hour demo window and enables full demo access.
    """
    demo_user = _get_demo_user(session_id, db)
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo session not found",
        )

    if demo_user.demo_started_at:
        # Already started, return current status
        return _build_session_response(demo_user)

    # Start the demo
    now = datetime.now(timezone.utc)
    demo_user.demo_started_at = now
    demo_user.demo_expires_at = now + timedelta(hours=DEMO_DURATION_HOURS)
    demo_user.video_skipped = data.video_skipped

    db.commit()
    db.refresh(demo_user)

    logger.info(f"Started demo for session: {session_id}, expires: {demo_user.demo_expires_at}")
    return _build_session_response(demo_user)


@router.get("/session/{session_id}", response_model=DemoSessionResponse)
async def get_session_status(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Get current demo session status and quotas."""
    demo_user = _get_demo_user(session_id, db)
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo session not found",
        )

    return _build_session_response(demo_user)


# ==============================================================================
# Demo Metrics Endpoints
# ==============================================================================

@router.get("/metrics", response_model=DemoMetricsListResponse)
async def get_demo_metrics(
    framework: str = Query(..., pattern="^(csf_2_0|ai_rmf)$"),
    demo_user: DemoUser = Depends(require_demo_session),
    db: Session = Depends(get_db),
):
    """
    Get limited demo metrics for a framework.

    Returns 1 metric per category for the specified framework.
    Demo-created metrics are included in the response.
    """
    # Get framework
    fw = db.query(Framework).filter(
        Framework.code == framework,
        Framework.active == True,
    ).first()

    if not fw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Framework not found: {framework}",
        )

    # Get category codes based on framework
    category_codes = get_demo_categories(framework)

    # Get categories for this framework
    categories = db.query(FrameworkCategory).join(
        FrameworkFunction
    ).filter(
        FrameworkFunction.framework_id == fw.id,
        FrameworkCategory.code.in_(category_codes),
    ).all()

    category_ids = [c.id for c in categories]

    # Get 1 metric per category (prefer high priority, with data)
    metrics = []
    for category_id in category_ids:
        metric = db.query(Metric).filter(
            Metric.category_id == category_id,
            Metric.active == True,
        ).order_by(
            Metric.priority_rank.asc(),  # High priority first (1)
            Metric.current_value.isnot(None).desc(),  # With data first
        ).first()

        if metric:
            metrics.append(metric)

    # Add demo-created metrics for this user and framework
    demo_metrics = db.query(DemoMetric).filter(
        DemoMetric.demo_user_id == demo_user.id,
        DemoMetric.framework == framework,
    ).all()

    # Convert to responses
    items = [_add_scores_to_response(m) for m in metrics]

    # Add demo metrics (from JSON data)
    for dm in demo_metrics:
        # Create a response from the stored metric data
        metric_data = dm.metric_data
        metric_data["id"] = str(dm.id)
        metric_data["is_demo_metric"] = True
        items.append(MetricResponse.model_validate(metric_data))

    return DemoMetricsListResponse(
        items=items,
        total=len(items),
        framework=framework,
        is_demo=True,
    )


@router.post("/ai/create-metric", response_model=DemoMetricResponse)
async def demo_create_metric(
    data: DemoMetricCreate,
    demo_user: DemoUser = Depends(require_demo_session),
    db: Session = Depends(get_db),
):
    """
    Create a metric via AI in demo mode.

    Limited to 2 metrics per framework. The metric is stored temporarily
    and will be deleted when the demo session expires.
    """
    # Check quota
    if data.framework == "csf_2_0":
        if demo_user.ai_metrics_created_csf >= AI_METRICS_QUOTA_PER_FRAMEWORK:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Demo limit reached: {AI_METRICS_QUOTA_PER_FRAMEWORK} AI metrics for CSF 2.0",
            )
    else:
        if demo_user.ai_metrics_created_ai_rmf >= AI_METRICS_QUOTA_PER_FRAMEWORK:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Demo limit reached: {AI_METRICS_QUOTA_PER_FRAMEWORK} AI metrics for AI RMF",
            )

    # Use provided metric data or generate via AI
    if data.metric_data:
        # Use the already-generated metric data (e.g., from AI Add flow where user edited it)
        metric_data = data.metric_data
        logger.info(f"Using provided metric data for demo user: {demo_user.email}")
    else:
        # Generate metric using AI
        from .ai import generate_metric_from_name as ai_generate_metric

        try:
            result = await ai_generate_metric(
                metric_name=data.metric_name,
                framework=data.framework,
                db=db,
            )

            if not result.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=result.get("error", "Failed to generate metric"),
                )

            metric_data = result["metric"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI metric generation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate metric. Please try again.",
            )

    # Store demo metric
    demo_metric = DemoMetric(
        demo_user_id=demo_user.id,
        metric_data=metric_data,
        framework=data.framework,
    )

    db.add(demo_metric)

    # Increment quota
    if data.framework == "csf_2_0":
        demo_user.ai_metrics_created_csf += 1
    else:
        demo_user.ai_metrics_created_ai_rmf += 1

    db.commit()
    db.refresh(demo_metric)

    logger.info(f"Created demo metric for session: {demo_user.session_id}, framework: {data.framework}")

    return DemoMetricResponse(
        id=demo_metric.id,
        framework=demo_metric.framework,
        metric_data=demo_metric.metric_data,
        created_at=demo_metric.created_at,
    )


@router.get("/ai/quota", response_model=DemoQuotas)
async def get_ai_quota(
    demo_user: DemoUser = Depends(require_demo_session),
):
    """Get current AI metric creation quota status."""
    return _build_quotas(demo_user)


# ==============================================================================
# Demo Data Cleanup (Admin)
# ==============================================================================

@router.delete("/cleanup/expired", status_code=status.HTTP_200_OK)
async def cleanup_expired_demos(
    db: Session = Depends(get_db),
):
    """
    Clean up expired demo sessions and their metrics.

    This endpoint should be called periodically (e.g., hourly cron job)
    to clean up expired demo data. Demo users are kept for lead tracking
    but marked as expired.
    """
    now = datetime.now(timezone.utc)

    # Find expired sessions that haven't been marked
    expired_count = db.query(DemoUser).filter(
        DemoUser.demo_expires_at < now,
        DemoUser.expired == False,
    ).update({"expired": True})

    # Demo metrics are automatically deleted via CASCADE when demo_user is deleted
    # But we want to keep demo_users for lead tracking, so just mark as expired

    db.commit()

    logger.info(f"Marked {expired_count} demo sessions as expired")

    return {"expired_sessions": expired_count}


# ==============================================================================
# Demo AI Chat Endpoints (Security Hardened)
# ==============================================================================

@router.get("/ai/chat-status", response_model=DemoAIChatStatusResponse)
async def get_ai_chat_status(
    framework: str = Query("csf_2_0", pattern="^(csf_2_0|ai_rmf)$"),
    demo_user: DemoUser = Depends(require_demo_session),
):
    """
    Get the current status of demo AI chat capability.

    Returns available starters, refinement options, and interaction limits.
    """
    lock_reason = None
    if demo_user.ai_chat_locked:
        lock_reason = "Chat access suspended due to suspicious activity"
    elif demo_user.ai_chat_interactions >= MAX_DEMO_CHAT_INTERACTIONS:
        lock_reason = "Demo chat limit reached"

    return DemoAIChatStatusResponse(
        can_use_chat=demo_user.can_use_ai_chat,
        interactions_used=demo_user.ai_chat_interactions,
        interactions_remaining=demo_user.ai_chat_interactions_remaining,
        chat_locked=demo_user.ai_chat_locked,
        lock_reason=lock_reason,
        starters=_get_starters_for_framework(framework),
        refinements=_get_refinements(),
    )


@router.post("/ai/guided-chat", response_model=DemoGuidedChatResponse)
async def demo_guided_chat(
    data: DemoGuidedChatRequest,
    demo_user: DemoUser = Depends(require_demo_session),
    db: Session = Depends(get_db),
):
    """
    Guided AI chat for demo mode.

    Only accepts pre-defined starter IDs, not free-form text.
    Limited to 6 total interactions (3 per framework).

    This endpoint is security-hardened to prevent:
    - Prompt injection attacks
    - API cost abuse
    - Unlimited conversations
    """
    # Check if chat is locked due to abuse
    if demo_user.ai_chat_locked:
        logger.warning(f"Locked demo user attempted chat: {demo_user.email}")
        return DemoGuidedChatResponse(
            success=False,
            error="Chat access has been suspended",
            interactions_used=demo_user.ai_chat_interactions,
            interactions_remaining=0,
            chat_locked=True,
            upgrade_cta=True,
        )

    # Check interaction limit
    if demo_user.ai_chat_interactions >= MAX_DEMO_CHAT_INTERACTIONS:
        logger.info(f"Demo chat limit reached for: {demo_user.email}")
        return DemoGuidedChatResponse(
            success=False,
            error="Demo chat limit reached. Upgrade for unlimited AI chat.",
            interactions_used=demo_user.ai_chat_interactions,
            interactions_remaining=0,
            chat_locked=False,
            upgrade_cta=True,
        )

    # SECURITY: Validate starter ID is from allowed list
    if data.starter_id not in ALLOWED_DEMO_STARTERS:
        # Track invalid request for abuse detection
        demo_user.invalid_request_count = (demo_user.invalid_request_count or 0) + 1

        # Lock if too many invalid requests
        if demo_user.invalid_request_count >= MAX_INVALID_REQUESTS_BEFORE_LOCK:
            demo_user.ai_chat_locked = True
            logger.warning(f"Demo user locked for abuse: {demo_user.email}")

        db.commit()

        logger.warning(f"Invalid demo starter attempt: {data.starter_id} from {demo_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid demo starter. Please select from the available options.",
        )

    # Validate refinement if provided
    if data.refinement_id and data.refinement_id not in DEMO_REFINEMENTS:
        demo_user.invalid_request_count = (demo_user.invalid_request_count or 0) + 1
        db.commit()

        logger.warning(f"Invalid refinement attempt: {data.refinement_id} from {demo_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refinement option",
        )

    # Get the starter configuration
    starter = ALLOWED_DEMO_STARTERS[data.starter_id]

    # Validate framework matches starter
    if data.framework == "csf_2_0" and data.starter_id not in CSF_DEMO_STARTERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This starter is not available for CSF 2.0",
        )
    if data.framework == "ai_rmf" and data.starter_id not in AI_RMF_DEMO_STARTERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This starter is not available for AI RMF",
        )

    # Import AI generation function
    from .ai import generate_metric_from_name as ai_generate_metric

    try:
        # Generate metric using the controlled prompt
        prompt = starter["prompt"]

        # Apply refinement if specified
        if data.refinement_id:
            refinement = DEMO_REFINEMENTS[data.refinement_id]
            if data.refinement_id == "adjust-target-higher":
                prompt += ". Set the target value to be more ambitious (e.g., 95%+)"
            elif data.refinement_id == "adjust-target-lower":
                prompt += ". Set a more achievable target value (e.g., 80%)"
            elif data.refinement_id == "change-frequency-weekly":
                prompt += ". Set the collection frequency to weekly"
            elif data.refinement_id == "change-frequency-monthly":
                prompt += ". Set the collection frequency to monthly"

        result = await ai_generate_metric(
            metric_name=prompt,
            framework=data.framework,
            db=db,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to generate metric"),
            )

        metric_data = result["metric"]

        # Increment interaction counter
        demo_user.ai_chat_interactions += 1
        db.commit()

        # Determine if we should show upgrade CTA
        show_upgrade_cta = demo_user.ai_chat_interactions >= (MAX_DEMO_CHAT_INTERACTIONS - 1)

        logger.info(
            f"Demo guided chat success for {demo_user.email}: "
            f"starter={data.starter_id}, interactions={demo_user.ai_chat_interactions}"
        )

        return DemoGuidedChatResponse(
            success=True,
            metric=metric_data,
            interactions_used=demo_user.ai_chat_interactions,
            interactions_remaining=demo_user.ai_chat_interactions_remaining,
            chat_locked=False,
            upgrade_cta=show_upgrade_cta,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Demo guided chat error for {demo_user.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate metric. Please try again.",
        )


@router.post("/ai/guided-chat/create-metric", response_model=DemoMetricResponse)
async def demo_guided_chat_create_metric(
    data: DemoGuidedChatRequest,
    demo_user: DemoUser = Depends(require_demo_session),
    db: Session = Depends(get_db),
):
    """
    Create a metric from the guided chat flow.

    This is the final step where the user confirms and creates the metric.
    Uses the AI quota system (2 per framework).
    """
    # First validate and generate the metric
    chat_response = await demo_guided_chat(data, demo_user, db)

    if not chat_response.success or not chat_response.metric:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=chat_response.error or "Failed to generate metric",
        )

    # Check AI metric quota
    if data.framework == "csf_2_0":
        if demo_user.ai_metrics_created_csf >= AI_METRICS_QUOTA_PER_FRAMEWORK:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Demo limit reached: {AI_METRICS_QUOTA_PER_FRAMEWORK} AI metrics for CSF 2.0",
            )
    else:
        if demo_user.ai_metrics_created_ai_rmf >= AI_METRICS_QUOTA_PER_FRAMEWORK:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Demo limit reached: {AI_METRICS_QUOTA_PER_FRAMEWORK} AI metrics for AI RMF",
            )

    # Store demo metric
    demo_metric = DemoMetric(
        demo_user_id=demo_user.id,
        metric_data=chat_response.metric,
        framework=data.framework,
    )

    db.add(demo_metric)

    # Increment quota
    if data.framework == "csf_2_0":
        demo_user.ai_metrics_created_csf += 1
    else:
        demo_user.ai_metrics_created_ai_rmf += 1

    db.commit()
    db.refresh(demo_metric)

    logger.info(
        f"Created demo metric via guided chat for {demo_user.email}: "
        f"framework={data.framework}"
    )

    return DemoMetricResponse(
        id=demo_metric.id,
        framework=demo_metric.framework,
        metric_data=demo_metric.metric_data,
        created_at=demo_metric.created_at,
    )
