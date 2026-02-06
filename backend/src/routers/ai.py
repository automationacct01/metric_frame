"""AI assistant API endpoints with multi-provider support.

This router provides AI-powered features:
- Chat-based metrics management
- Framework-aware explanations and reports
- AI metric recommendations
- Metric enhancement suggestions

Supports multiple AI providers:
- Anthropic Claude (default)
- OpenAI GPT-4
- Together.ai
- Azure OpenAI
- AWS Bedrock
- GCP Vertex AI
"""

import json
import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Metric, AIChangeLog, UserAIConfiguration, AIProvider as AIProviderModel, User
from .auth import require_editor
from ..schemas import (
    AIChatRequest,
    AIResponse as AIResponseSchema,
    AIApplyRequest,
    AIChangeLogResponse,
    MetricCreate,
    MetricUpdate,
)
from ..services.ai import (
    BaseAIProvider,
    ProviderType,
    ProviderCredentials,
    AIResponse as ProviderAIResponse,
    AIProviderError,
    AuthenticationError,
    RateLimitError,
)
from ..services.ai.provider_factory import get_provider, create_initialized_provider
from ..services.ai.providers.anthropic_provider import AnthropicProvider, FRAMEWORK_PROMPTS
from ..services.ai.utils.encryption import CredentialEncryption
from ..services.scoring import compute_function_scores, get_metrics_needing_attention
from ..services.metric_recommendations import (
    generate_metric_recommendations,
    get_coverage_gaps,
    suggest_metrics_for_gap,
    get_metric_distribution,
)

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_user_id() -> UUID:
    """Get current user ID. TODO: Replace with actual auth."""
    # For now, return a default admin user ID
    # In production, this would come from JWT token or session
    return UUID("00000000-0000-0000-0000-000000000001")


# =============================================================================
# PROVIDER HELPER FUNCTIONS
# =============================================================================

async def get_active_provider(db: Session, user_id: Optional[UUID] = None) -> BaseAIProvider:
    """Get the active AI provider for the current context.

    Priority:
    1. Dev mode: Use system env vars if AI_DEV_MODE=true
    2. User config: Use user's active AI configuration
    3. Raise error if no provider configured

    Args:
        db: Database session
        user_id: Optional user ID for user-specific config

    Returns:
        Initialized BaseAIProvider instance

    Raises:
        HTTPException: If no provider is configured or available
    """
    # Check dev mode first (env var override for local development)
    if os.getenv("AI_DEV_MODE", "").lower() == "true":
        dev_provider = os.getenv("AI_DEV_PROVIDER", "anthropic").lower()
        dev_model = os.getenv("AI_DEV_MODEL")

        # Get appropriate credentials based on provider
        credentials = ProviderCredentials()

        if dev_provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=503,
                    detail="AI_DEV_MODE enabled but ANTHROPIC_API_KEY not set"
                )
            credentials.api_key = api_key
            provider_type = ProviderType.ANTHROPIC

        elif dev_provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=503,
                    detail="AI_DEV_MODE enabled but OPENAI_API_KEY not set"
                )
            credentials.api_key = api_key
            provider_type = ProviderType.OPENAI

        elif dev_provider == "together":
            api_key = os.getenv("TOGETHER_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=503,
                    detail="AI_DEV_MODE enabled but TOGETHER_API_KEY not set"
                )
            credentials.api_key = api_key
            provider_type = ProviderType.TOGETHER

        else:
            raise HTTPException(
                status_code=503,
                detail=f"Unsupported AI_DEV_PROVIDER: {dev_provider}"
            )

        provider = await create_initialized_provider(provider_type, credentials)
        if not provider:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to initialize {dev_provider} provider in dev mode"
            )
        return provider

    # Check for legacy env var (backwards compatibility)
    legacy_api_key = os.getenv("ANTHROPIC_API_KEY")
    if legacy_api_key and legacy_api_key != "your-anthropic-api-key-here":
        credentials = ProviderCredentials(api_key=legacy_api_key)
        provider = await create_initialized_provider(ProviderType.ANTHROPIC, credentials)
        if provider:
            return provider

    # If user_id provided, check for user's active configuration
    if user_id:
        user_config = (
            db.query(UserAIConfiguration)
            .filter(
                UserAIConfiguration.user_id == user_id,
                UserAIConfiguration.is_active == True,
            )
            .first()
        )

        if user_config:
            # Get provider type from database
            ai_provider = db.query(AIProviderModel).filter(
                AIProviderModel.id == user_config.provider_id
            ).first()

            if ai_provider:
                provider_type = ProviderType(ai_provider.code)

                # Decrypt credentials
                encryption = CredentialEncryption()
                decrypted = encryption.decrypt_credentials(user_config.encrypted_credentials)
                credentials = ProviderCredentials(**decrypted)

                provider = await create_initialized_provider(provider_type, credentials)
                if provider:
                    return provider

    raise HTTPException(
        status_code=403,
        detail="Please configure an AI provider in Settings > AI Configuration"
    )


def get_system_prompt_for_mode(mode: str, framework: str = "csf_2_0") -> str:
    """Generate system prompt based on mode and framework.

    Args:
        mode: Operation mode (metrics, explain, report, recommendations)
        framework: Framework code (csf_2_0, ai_rmf, cyber_ai_profile)

    Returns:
        System prompt string
    """
    fw = FRAMEWORK_PROMPTS.get(framework, FRAMEWORK_PROMPTS["csf_2_0"])
    framework_context = f"{fw['name']}\n{fw['functions']}\n{fw['categories']}"
    fw_name = fw['name']

    if mode == "metrics":
        return f"""You are a cybersecurity metrics assistant specializing in {fw_name}.

{framework_context}

When asked to add or modify metrics, respond ONLY with valid JSON matching this schema:

{{
  "assistant_message": "Brief explanation of what you're creating/modifying",
  "actions": [
    {{
      "action": "add_metric",
      "metric": {{
        "name": "Clear, specific metric name",
        "description": "Plain-language definition of what this measures",
        "formula": "Human-readable calculation method",
        "framework": "{framework}",
        "function_code": "function_code (e.g., gv, id, pr, de, rs, rc for CSF)",
        "category_code": "category_code (e.g., GV.OC, ID.AM)",
        "priority_rank": 1|2|3,
        "direction": "higher_is_better|lower_is_better|target_range|binary",
        "target_value": 95.0,
        "target_units": "%|count|days|hours|boolean",
        "owner_function": "GRC|SecOps|IAM|IT Ops|IR|BCP|CISO",
        "collection_frequency": "daily|weekly|monthly|quarterly|ad_hoc",
        "data_source": "Tool or process providing data"
      }}
    }}
  ],
  "needs_confirmation": true
}}

Focus on outcome-based metrics that help communicate risk to executives. Set realistic enterprise targets."""

    elif mode == "explain":
        return f"""You are a cybersecurity metrics expert specializing in {fw_name}.

{framework_context}

Explain metrics, scoring, and risk concepts in clear business language. Focus on:
- What the metric measures and why it matters
- How scores are calculated (gap-to-target methodology)
- Business impact of current performance
- Recommendations for improvement

Use non-technical language suitable for executives and board members."""

    elif mode == "report":
        return f"""Generate executive-ready cybersecurity risk narrative based on {fw_name} function scores.

{framework_context}

Focus on:
- Material gaps to target performance
- Business risk implications
- Key trends (if data available)
- Prioritized improvement areas

Use clear, non-technical language appropriate for CISO briefings to executives and board members.
Keep narrative concise (1-2 paragraphs per function with significant gaps)."""

    elif mode == "recommendations":
        return f"""You are a cybersecurity metrics strategist. Based on the current metric coverage and scores, recommend new metrics to improve security posture visibility.

{framework_context}

Analyze gaps in framework coverage and recommend metrics that would:
1. Fill coverage gaps in underrepresented functions/categories
2. Address areas with low scores or missing data
3. Align with industry best practices
4. Support executive decision-making

Respond with JSON:
{{
  "recommendations": [
    {{
      "metric_name": "Recommended metric name",
      "description": "What it measures",
      "function_code": "target_function",
      "category_code": "target_category",
      "priority": 1|2|3,
      "rationale": "Why this metric is recommended",
      "expected_impact": "How this improves security visibility"
    }}
  ],
  "gap_analysis": {{
    "underrepresented_functions": ["list of functions with few metrics"],
    "coverage_percentage": 75.0,
    "overall_assessment": "Summary of current coverage state"
  }}
}}"""

    else:
        # Default to explain mode
        return f"""You are a cybersecurity assistant specializing in {fw_name}.

{framework_context}

Provide helpful, accurate information about cybersecurity metrics, frameworks, and best practices."""


def get_default_model_for_provider(provider: BaseAIProvider) -> str:
    """Get the default model ID for a provider.

    Args:
        provider: The AI provider instance

    Returns:
        Default model ID string
    """
    if isinstance(provider, AnthropicProvider):
        return "claude-sonnet-4-5-20250929"

    # Check provider type for other providers
    if hasattr(provider, 'provider_type'):
        if provider.provider_type == ProviderType.OPENAI:
            return "gpt-4o"
        elif provider.provider_type == ProviderType.TOGETHER:
            return "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
        elif provider.provider_type == ProviderType.AZURE:
            return "gpt-4o"  # Azure deployments vary
        elif provider.provider_type == ProviderType.BEDROCK:
            return "anthropic.claude-3-5-sonnet-20241022-v2:0"
        elif provider.provider_type == ProviderType.VERTEX:
            return "gemini-1.5-pro"

    return "default"


@router.post("/chat", response_model=AIResponseSchema)
async def ai_chat(
    request: AIChatRequest,
    framework: str = Query("csf_2_0", description="Framework code (csf_2_0, ai_rmf, cyber_ai_profile)"),
    db: Session = Depends(get_db),
):
    """
    Chat with AI assistant for metrics management and explanation.

    Modes:
    - metrics: Generate or modify metrics (returns structured actions)
    - explain: Explain metrics, scoring, or risk concepts
    - report: Generate executive narrative from current scores
    - recommendations: Get AI recommendations for new metrics

    Frameworks:
    - csf_2_0: NIST Cybersecurity Framework 2.0 (default)
    - ai_rmf: NIST AI Risk Management Framework 1.0
    - cyber_ai_profile: NIST Cyber AI Profile (extends CSF 2.0)
    """
    # Validate framework
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework. Must be one of: {valid_frameworks}"
        )

    try:
        # Get active AI provider for current user
        user_id = get_current_user_id()
        provider = await get_active_provider(db, user_id)
        model = get_default_model_for_provider(provider)

        # Prepare context based on mode
        context_str = ""

        if request.mode == "report":
            # Get current scores for report generation
            function_scores = compute_function_scores(db)
            attention_metrics = get_metrics_needing_attention(db, limit=5)
            context_str = json.dumps({
                "framework": framework,
                "function_scores": [fs.model_dump() for fs in function_scores],
                "metrics_needing_attention": attention_metrics[:3],
            })

        elif request.mode == "metrics" and request.context_opts:
            # Get existing metrics context if requested
            if request.context_opts.get("include_existing_metrics"):
                existing_metrics = db.query(Metric).filter(Metric.active == True).limit(20).all()
                context_str = json.dumps({
                    "framework": framework,
                    "existing_metrics": [
                        {
                            "name": m.name,
                            "function": m.csf_function.value if m.csf_function else "unknown",
                            "description": m.description
                        }
                        for m in existing_metrics
                    ]
                })

        # Build messages for provider
        system_prompt = get_system_prompt_for_mode(request.mode, framework)
        user_message = request.message
        if context_str:
            user_message = f"Context:\n{context_str}\n\nRequest:\n{request.message}"

        messages = [{"role": "user", "content": user_message}]

        # Generate AI response using provider
        response = await provider.generate_response(
            messages=messages,
            model=model,
            system_prompt=system_prompt,
            max_tokens=4096,
            temperature=0.7,
        )

        # Parse response based on mode
        if request.mode == "metrics":
            # Try to parse JSON response for metrics mode
            # Strip markdown code block wrappers if present
            content = response.content.strip()
            if content.startswith("```"):
                # Remove opening ```json or ``` and closing ```
                lines = content.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]  # Remove opening fence
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]  # Remove closing fence
                content = "\n".join(lines).strip()

            try:
                parsed = json.loads(content)
                ai_response = parsed
            except json.JSONDecodeError:
                # If not valid JSON, wrap in standard format
                ai_response = {
                    "assistant_message": response.content,
                    "actions": [],
                    "needs_confirmation": False,
                }
        else:
            ai_response = {
                "assistant_message": response.content,
                "actions": [],
                "needs_confirmation": False,
            }

        # Log the interaction
        change_log = AIChangeLog(
            operation_type="chat",
            user_prompt=request.message,
            ai_response_json=ai_response,
            applied=False,
        )
        db.add(change_log)
        db.commit()

        return AIResponseSchema(**ai_response)

    except HTTPException:
        raise
    except AIProviderError as e:
        raise HTTPException(status_code=503, detail=f"AI provider error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


@router.post("/actions/apply")
async def apply_ai_actions(
    request: AIApplyRequest,
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """Apply AI-generated actions after user confirmation.

    Requires Editor or Admin role. Viewers cannot apply AI actions.
    """
    applied_by = current_user.email

    if not request.user_confirmation:
        raise HTTPException(status_code=400, detail="User confirmation required")
    
    applied_results = []
    errors = []
    
    for action in request.actions:
        try:
            if action.action == "add_metric":
                if not action.metric:
                    errors.append(f"No metric data provided for add_metric action")
                    continue
                
                # Check for duplicate name
                existing = db.query(Metric).filter(Metric.name == action.metric.name).first()
                if existing:
                    errors.append(f"Metric '{action.metric.name}' already exists")
                    continue
                
                # Create new metric
                db_metric = Metric(**action.metric.model_dump())
                db.add(db_metric)
                db.commit()
                db.refresh(db_metric)
                
                applied_results.append({
                    "action": "add_metric",
                    "metric_id": str(db_metric.id),
                    "metric_name": db_metric.name,
                    "status": "created"
                })
                
                # Log the application
                change_log = AIChangeLog(
                    operation_type="create",
                    metric_id=db_metric.id,
                    user_prompt=f"Applied AI action: add_metric for {action.metric.name}",
                    ai_response_json={"action": action.model_dump()},
                    applied=True,
                    applied_by=applied_by,
                    applied_at=datetime.utcnow(),
                )
                db.add(change_log)
            
            elif action.action == "update_metric":
                if not action.metric_id or not action.changes:
                    errors.append(f"Missing metric_id or changes for update_metric action")
                    continue
                
                metric = db.query(Metric).filter(Metric.id == action.metric_id).first()
                if not metric:
                    errors.append(f"Metric {action.metric_id} not found")
                    continue
                
                # Apply changes
                for field, value in action.changes.items():
                    if hasattr(metric, field):
                        setattr(metric, field, value)
                
                db.commit()
                
                applied_results.append({
                    "action": "update_metric",
                    "metric_id": str(metric.id),
                    "metric_name": metric.name,
                    "changes_applied": action.changes,
                    "status": "updated"
                })
                
                # Log the application
                change_log = AIChangeLog(
                    operation_type="update",
                    metric_id=metric.id,
                    user_prompt=f"Applied AI action: update_metric for {metric.name}",
                    ai_response_json={"action": action.model_dump()},
                    applied=True,
                    applied_by=applied_by,
                    applied_at=datetime.utcnow(),
                )
                db.add(change_log)

            elif action.action == "delete_metric":
                if not action.metric_id:
                    errors.append(f"Missing metric_id for delete_metric action")
                    continue
                
                metric = db.query(Metric).filter(Metric.id == action.metric_id).first()
                if not metric:
                    errors.append(f"Metric {action.metric_id} not found")
                    continue
                
                # Soft delete
                metric.active = False
                db.commit()
                
                applied_results.append({
                    "action": "delete_metric",
                    "metric_id": str(metric.id),
                    "metric_name": metric.name,
                    "status": "deactivated"
                })
                
                # Log the application
                change_log = AIChangeLog(
                    operation_type="delete",
                    metric_id=metric.id,
                    user_prompt=f"Applied AI action: delete_metric for {metric.name}",
                    ai_response_json={"action": action.model_dump()},
                    applied=True,
                    applied_by=applied_by,
                    applied_at=datetime.utcnow(),
                )
                db.add(change_log)
            
            else:
                errors.append(f"Unknown action type: {action.action}")
        
        except Exception as e:
            errors.append(f"Error applying {action.action}: {str(e)}")
    
    db.commit()
    
    return {
        "message": f"Applied {len(applied_results)} actions with {len(errors)} errors",
        "applied_results": applied_results,
        "errors": errors,
    }


@router.get("/history", response_model=List[AIChangeLogResponse])
async def get_ai_history(
    limit: int = 50,
    offset: int = 0,
    applied_only: bool = False,
    db: Session = Depends(get_db),
):
    """Get AI change history with pagination."""
    
    query = db.query(AIChangeLog)
    
    if applied_only:
        query = query.filter(AIChangeLog.applied == True)
    
    history = (
        query
        .order_by(AIChangeLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return [AIChangeLogResponse.model_validate(h) for h in history]


@router.get("/suggest/improvements")
async def suggest_improvements(
    function_code: Optional[str] = None,
    framework: str = Query("csf_2_0", description="Framework code"),
    db: Session = Depends(get_db),
):
    """Get AI suggestions for improving metrics or scores."""
    try:
        # Get active AI provider for current user
        user_id = get_current_user_id()
        provider = await get_active_provider(db, user_id)
        model = get_default_model_for_provider(provider)

        # Get current performance data
        function_scores = compute_function_scores(db)
        attention_metrics = get_metrics_needing_attention(db, limit=10)

        # Filter by function if specified
        if function_code:
            function_scores = [fs for fs in function_scores if fs.function.value == function_code]
            attention_metrics = [m for m in attention_metrics if m["csf_function"] == function_code]

        # Generate improvement suggestions
        context_str = json.dumps({
            "framework": framework,
            "function_scores": [fs.model_dump() for fs in function_scores],
            "metrics_needing_attention": attention_metrics,
        })

        message = f"Based on the current metrics performance, what are the top 3 improvement recommendations for {'function ' + function_code if function_code else 'overall cybersecurity posture'}?"
        user_message = f"Context:\n{context_str}\n\nRequest:\n{message}"

        system_prompt = get_system_prompt_for_mode("explain", framework)
        messages = [{"role": "user", "content": user_message}]

        response = await provider.generate_response(
            messages=messages,
            model=model,
            system_prompt=system_prompt,
            max_tokens=2048,
            temperature=0.7,
        )

        return {
            "recommendations": response.content,
            "based_on": {
                "framework": framework,
                "function_count": len(function_scores),
                "metrics_analyzed": len(attention_metrics),
                "focus_function": function_code,
            }
        }

    except HTTPException:
        raise
    except AIProviderError as e:
        raise HTTPException(status_code=503, detail=f"AI provider error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


@router.get("/status")
async def get_ai_status(db: Session = Depends(get_db)):
    """Get AI service status and configuration."""
    # Check what provider is available
    available = False
    provider_name = None
    model = None

    try:
        # Try to get active provider for current user
        user_id = get_current_user_id()
        provider = await get_active_provider(db, user_id)
        available = True
        provider_name = provider.provider_type.value
        model = get_default_model_for_provider(provider)
    except HTTPException:
        # No provider configured
        pass

    # Check dev mode status
    dev_mode = os.getenv("AI_DEV_MODE", "").lower() == "true"
    dev_provider = os.getenv("AI_DEV_PROVIDER", "anthropic") if dev_mode else None

    # Check legacy API key
    legacy_key = os.getenv("ANTHROPIC_API_KEY")
    legacy_available = bool(legacy_key and legacy_key != "your-anthropic-api-key-here")

    return {
        "available": available,
        "model": model,
        "provider": provider_name,
        "dev_mode": dev_mode,
        "dev_provider": dev_provider,
        "legacy_api_key_present": legacy_available,
        "supported_providers": ["anthropic", "openai", "together", "azure", "bedrock", "vertex"],
        "supported_modes": ["metrics", "explain", "report", "recommendations"],
        "supported_frameworks": ["csf_2_0", "ai_rmf", "cyber_ai_profile"],
    }


# ==============================================================================
# RECOMMENDATIONS ENDPOINTS
# ==============================================================================

@router.post("/recommendations")
async def get_ai_recommendations(
    framework: str = Query("csf_2_0", description="Framework code"),
    max_recommendations: int = Query(10, ge=1, le=25, description="Maximum recommendations"),
    db: Session = Depends(get_db),
):
    """
    Get AI-powered metric recommendations based on framework coverage analysis.

    Analyzes current metrics coverage and generates recommendations for:
    - Filling coverage gaps in underrepresented functions/categories
    - Addressing areas with low scores or missing data
    - Aligning with industry best practices
    """
    try:
        # Verify we have an active provider for current user
        user_id = get_current_user_id()
        await get_active_provider(db, user_id)
    except HTTPException:
        raise HTTPException(
            status_code=503,
            detail="AI service is not available. Please configure an AI provider."
        )

    result = await generate_metric_recommendations(db, framework, max_recommendations)

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to generate recommendations")
        )

    return result


@router.get("/recommendations/gaps")
async def get_framework_gaps(
    framework: str = Query("csf_2_0", description="Framework code"),
    db: Session = Depends(get_db),
):
    """
    Get coverage gaps in a framework.

    Returns functions and categories that have no metrics or insufficient coverage.
    """
    gaps = get_coverage_gaps(db, framework)

    if "error" in gaps:
        raise HTTPException(status_code=404, detail=gaps["error"])

    return gaps


@router.post("/recommendations/suggest")
async def suggest_metrics_for_coverage_gap(
    framework: str = Query("csf_2_0", description="Framework code"),
    function_code: Optional[str] = Query(None, description="Target function code"),
    category_code: Optional[str] = Query(None, description="Target category code"),
    count: int = Query(5, ge=1, le=10, description="Number of suggestions"),
    db: Session = Depends(get_db),
):
    """
    Suggest specific metrics to fill a particular coverage gap.

    Optionally focus on a specific function or category to get targeted suggestions.
    """
    try:
        # Verify we have an active provider for current user
        user_id = get_current_user_id()
        await get_active_provider(db, user_id)
    except HTTPException:
        raise HTTPException(
            status_code=503,
            detail="AI service is not available. Please configure an AI provider."
        )

    result = await suggest_metrics_for_gap(
        db, framework, function_code, category_code, count
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to generate suggestions")
        )

    return result


@router.get("/recommendations/distribution")
async def get_metrics_distribution(
    framework: str = Query("csf_2_0", description="Framework code"),
    db: Session = Depends(get_db),
):
    """
    Get the distribution of metrics across framework functions and categories.

    Useful for identifying imbalances in metric coverage.
    """
    distribution = get_metric_distribution(db, framework)

    if "error" in distribution:
        raise HTTPException(status_code=404, detail=distribution["error"])

    return distribution


@router.post("/generate-metric")
async def generate_metric_from_name(
    metric_name: str = Query(..., description="The name of the metric to generate"),
    framework: str = Query("csf_2_0", description="Framework code (csf_2_0, ai_rmf)"),
    token: str = Query(..., description="Authentication token"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """
    Generate a complete metric definition from just the metric name using AI.

    Requires Editor or Admin role. Viewers cannot generate metrics.

    The AI will analyze the metric name and generate:
    - Description
    - CSF/Framework function and category mapping
    - Priority rank
    - Direction (higher_is_better, lower_is_better, etc.)
    - Target value and units
    - Owner function
    - Collection frequency

    Returns a preview of the metric for user confirmation before saving.
    """
    # Get framework functions and categories for context
    from ..models import Framework, FrameworkFunction, FrameworkCategory

    fw = db.query(Framework).filter(Framework.code == framework).first()
    if not fw:
        raise HTTPException(status_code=404, detail=f"Framework '{framework}' not found")

    functions = db.query(FrameworkFunction).filter(FrameworkFunction.framework_id == fw.id).all()

    # Build function, category, and subcategory info for the AI prompt
    from ..models import FrameworkSubcategory

    function_info = []
    category_info = []
    subcategory_info = []
    for func in functions:
        function_info.append(f"{func.code.upper()} ({func.name})")
        categories = db.query(FrameworkCategory).filter(FrameworkCategory.function_id == func.id).all()
        for cat in categories:
            category_info.append(f"{cat.code} ({cat.name}) - under {func.code.upper()}")
            subcategories = db.query(FrameworkSubcategory).filter(FrameworkSubcategory.category_id == cat.id).all()
            for subcat in subcategories:
                subcategory_info.append(f"{subcat.code}: {subcat.outcome[:60]}...")

    response_text = ""
    try:
        # Get active AI provider for current user
        user_id = get_current_user_id()
        provider = await get_active_provider(db, user_id)
        model = get_default_model_for_provider(provider)

        system_prompt = f"""You are a cybersecurity metrics expert. Generate metric definitions for {fw.name}.

Available framework functions: {', '.join(function_info)}

Available categories:
{chr(10).join(category_info[:30])}

Available subcategories (sample):
{chr(10).join(subcategory_info[:40])}

IMPORTANT: Respond with ONLY a valid JSON object, no markdown, no explanation, no code blocks. Just the raw JSON."""

        user_prompt = f"""Generate a complete metric definition for: "{metric_name}"

Return this exact JSON structure (fill in appropriate values):
{{"name": "{metric_name}", "description": "description here", "csf_function": "function_code", "csf_category_code": "XX.YY", "csf_subcategory_code": "XX.YY-NN", "priority_rank": 1, "direction": "higher_is_better", "target_value": 95, "target_units": "percent", "current_value": null, "owner_function": "owner here", "collection_frequency": "monthly", "formula": "calculation formula here", "risk_definition": "why this metric matters", "notes": null}}

Rules:
- csf_function must be one of: {', '.join([f.code for f in functions])}
- csf_category_code must be a valid category code (like GV.OC, PR.AA, DE.CM, etc.)
- csf_subcategory_code: REQUIRED - must be a valid subcategory code (like PR.PS-02, DE.CM-01, etc.) that matches the category
- priority_rank: 1=High, 2=Medium, 3=Low
- direction: higher_is_better, lower_is_better, target_range, or binary
- target_units: percent, hours, days, count, or similar
- collection_frequency: daily, weekly, monthly, quarterly, or ad_hoc
- formula: REQUIRED - provide a clear calculation formula as a ratio (e.g., "Patched Systems / Total Systems"). Do NOT include "× 100" conversion - the system handles percentage display automatically
- risk_definition: REQUIRED - explain why an organization needs to track this metric and what business risk it addresses (1-2 sentences)"""

        messages = [{"role": "user", "content": user_prompt}]

        response = await provider.generate_response(
            messages=messages,
            model=model,
            system_prompt=system_prompt,
            max_tokens=1024,
            temperature=0.7,
        )

        # Extract text response
        response_text = response.content.strip()

        # Clean up response - remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first line (```json) and last line (```)
            lines = [l for l in lines if not l.startswith("```")]
            response_text = "\n".join(lines).strip()

        # Parse JSON
        metric_data = json.loads(response_text)

        # Ensure required fields and normalize
        metric_data["name"] = metric_name  # Keep original name
        metric_data["priority_rank"] = int(metric_data.get("priority_rank", 2))
        metric_data["direction"] = metric_data.get("direction", "higher_is_better")
        metric_data["active"] = True

        # Convert target_value to number if string
        if isinstance(metric_data.get("target_value"), str):
            try:
                metric_data["target_value"] = float(metric_data["target_value"])
            except:
                metric_data["target_value"] = None

        # Look up function_id from csf_function
        csf_function = metric_data.get("csf_function", "").lower()
        func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == csf_function,
            FrameworkFunction.framework_id == fw.id
        ).first()

        if func:
            metric_data["function_id"] = str(func.id)
            metric_data["framework_id"] = str(fw.id)

            # Look up category_id from csf_category_code
            csf_category_code = metric_data.get("csf_category_code", "")
            category = None
            if csf_category_code:
                category = db.query(FrameworkCategory).filter(
                    FrameworkCategory.code == csf_category_code,
                    FrameworkCategory.function_id == func.id
                ).first()
                if category:
                    metric_data["category_id"] = str(category.id)

            # Look up subcategory_id from csf_subcategory_code
            csf_subcategory_code = metric_data.get("csf_subcategory_code", "")
            if csf_subcategory_code and category:
                subcategory = db.query(FrameworkSubcategory).filter(
                    FrameworkSubcategory.code == csf_subcategory_code,
                    FrameworkSubcategory.category_id == category.id
                ).first()
                if subcategory:
                    metric_data["subcategory_id"] = str(subcategory.id)
                    metric_data["csf_subcategory_outcome"] = subcategory.outcome

        # Generate metric_number
        # Pattern: CSF-XX-NNN where XX is function code (uppercase)
        prefix = "CSF" if framework == "csf_2_0" else "AI"
        func_prefix = csf_function.upper() if csf_function else "XX"

        # Find the highest existing metric number for this function
        existing_metrics = db.query(Metric).filter(
            Metric.metric_number.like(f"{prefix}-{func_prefix}-%")
        ).all()

        max_num = 0
        for m in existing_metrics:
            try:
                num = int(m.metric_number.split("-")[-1])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass

        metric_data["metric_number"] = f"{prefix}-{func_prefix}-{str(max_num + 1).zfill(3)}"

        return {
            "success": True,
            "metric": metric_data,
            "message": "Metric generated successfully. Please review and confirm."
        }

    except HTTPException:
        raise
    except AIProviderError as e:
        raise HTTPException(status_code=503, detail=f"AI provider error: {str(e)}")
    except json.JSONDecodeError as e:
        # Return partial data if JSON parsing fails
        return {
            "success": False,
            "error": f"Failed to parse AI response: {str(e)}",
            "raw_response": response_text,
            "metric": {
                "name": metric_name,
                "description": "",
                "priority_rank": 2,
                "direction": "higher_is_better",
                "active": True
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating metric: {str(e)}")