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
- Azure AI Foundry
- AWS Bedrock
- GCP Vertex AI
"""

import json
import logging
import os
import re
import traceback
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from ..db import get_db
from ..models import Metric, AIChangeLog, UserAIConfiguration, AIProvider as AIProviderModel, User
from .auth import require_editor, get_current_user
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

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================



# =============================================================================
# PROVIDER HELPER FUNCTIONS
# =============================================================================

async def get_active_provider(db: Session, user_id: Optional[UUID] = None) -> BaseAIProvider:
    """Get the active AI provider for the current context.

    Priority:
    1. User config: Use user's active AI configuration (explicit choice wins)
    2. Dev mode: Use system env vars if AI_DEV_MODE=true (fallback)
    3. Legacy: Use ANTHROPIC_API_KEY env var (backwards compatibility)
    4. Raise error if no provider configured

    Args:
        db: Database session
        user_id: Optional user ID for user-specific config

    Returns:
        Initialized BaseAIProvider instance

    Raises:
        HTTPException: If no provider is configured or available
    """
    # Priority 1: User's active configuration (explicit user choice wins)
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
                    # Attach user's configured model if set
                    if user_config.model_id:
                        provider._configured_model = user_config.model_id
                    return provider

    # Priority 2: Dev mode fallback (env var override for local development)
    if os.getenv("AI_DEV_MODE", "").lower() == "true":
        dev_provider = os.getenv("AI_DEV_PROVIDER", "anthropic").lower()
        dev_model = os.getenv("AI_DEV_MODEL")

        # Get appropriate credentials based on provider
        credentials = ProviderCredentials()

        if dev_provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if api_key:
                credentials.api_key = api_key
                provider_type = ProviderType.ANTHROPIC
            else:
                raise HTTPException(
                    status_code=503,
                    detail="AI_DEV_MODE enabled but ANTHROPIC_API_KEY not set"
                )

        elif dev_provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                credentials.api_key = api_key
                provider_type = ProviderType.OPENAI
            else:
                raise HTTPException(
                    status_code=503,
                    detail="AI_DEV_MODE enabled but OPENAI_API_KEY not set"
                )

        elif dev_provider == "together":
            api_key = os.getenv("TOGETHER_API_KEY")
            if api_key:
                credentials.api_key = api_key
                provider_type = ProviderType.TOGETHER
            else:
                raise HTTPException(
                    status_code=503,
                    detail="AI_DEV_MODE enabled but TOGETHER_API_KEY not set"
                )

        elif dev_provider == "local":
            endpoint = os.getenv("LOCAL_AI_ENDPOINT", "http://localhost:11434/v1")
            credentials.local_endpoint = endpoint
            credentials.api_key = os.getenv("LOCAL_AI_API_KEY")
            provider_type = ProviderType.LOCAL

        else:
            raise HTTPException(
                status_code=503,
                detail=f"Unsupported AI_DEV_PROVIDER: {dev_provider}"
            )

        provider = await create_initialized_provider(provider_type, credentials)
        if provider:
            return provider

    # Priority 3: Legacy env var (backwards compatibility)
    legacy_api_key = os.getenv("ANTHROPIC_API_KEY")
    if legacy_api_key and legacy_api_key != "your-anthropic-api-key-here":
        credentials = ProviderCredentials(api_key=legacy_api_key)
        provider = await create_initialized_provider(ProviderType.ANTHROPIC, credentials)
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

    # Framework-specific examples for function codes and category codes
    if framework == "ai_rmf":
        func_example = "govern, map, measure, or manage"
        cat_example = "GOVERN-1, MAP-2, MEASURE-3, MANAGE-1"
    elif framework == "cyber_ai_profile":
        func_example = "gv, id, pr, de, rs, rc (CSF 2.0 codes)"
        cat_example = "GV.OC, ID.AM, PR.AA, DE.CM"
    else:
        func_example = "gv, id, pr, de, rs, rc"
        cat_example = "GV.OC, ID.AM, PR.AA, DE.CM"

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
        "csf_function": "function code ({func_example})",
        "csf_category_code": "category code (e.g., {cat_example})",
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
      "csf_function": "target function code ({func_example})",
      "csf_category_code": "target category code (e.g., {cat_example})",
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
    # Check for user-configured model (set by get_active_provider)
    configured = getattr(provider, '_configured_model', None)
    if configured:
        return configured

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
        elif provider.provider_type == ProviderType.LOCAL:
            # Use discovered models for local provider
            default = provider.get_default_model()
            if default:
                return default
            models = provider.get_available_models()
            return models[0].model_id if models else "default"

    return "default"


INTENT_CLASSIFICATION_PROMPT = """Classify this user message into exactly one mode. Reply with ONLY the mode name, nothing else.

Modes:
- metrics: User wants to create, modify, delete, or manage metrics (e.g., "create a metric for...", "add a KRI for...", "update the target for...", "delete the metric...")
- report: User wants to generate a report, executive summary, or risk narrative (e.g., "generate a report", "executive summary", "summarize our posture", "board briefing")
- explain: User wants to understand a concept, metric, score, or framework topic (e.g., "what is...", "explain...", "how does...", "why is...", general questions)

Default to "explain" if unclear.

User message: """


async def classify_intent(message: str, provider, model: str) -> str:
    """Classify user message intent to determine the appropriate AI mode.

    Uses a lightweight AI call with a short prompt to classify the message.
    Returns one of: 'metrics', 'explain', 'report'.
    """
    try:
        response = await provider.generate_response(
            messages=[{"role": "user", "content": INTENT_CLASSIFICATION_PROMPT + message}],
            model=model,
            system_prompt="You are a message classifier. Reply with exactly one word: metrics, explain, or report.",
            max_tokens=10,
            temperature=0.0,
        )
        mode = response.content.strip().lower().rstrip(".")
        if mode in ("metrics", "explain", "report"):
            return mode
        # Check if the response contains one of the modes
        for m in ("metrics", "report", "explain"):
            if m in mode:
                return m
        return "explain"
    except Exception as e:
        logger.warning(f"Intent classification failed, defaulting to explain: {e}")
        return "explain"


@router.post("/chat", response_model=AIResponseSchema)
@limiter.limit("20/minute")
async def ai_chat(
    chat_request: AIChatRequest,
    request: Request,
    framework: str = Query("csf_2_0", description="Framework code (csf_2_0, ai_rmf, cyber_ai_profile)"),
    current_user: User = Depends(get_current_user),
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
        user_id = current_user.id
        provider = await get_active_provider(db, user_id)
        model = get_default_model_for_provider(provider)

        # Auto mode: classify intent to determine actual mode
        resolved_mode = chat_request.mode
        if chat_request.mode == "auto":
            resolved_mode = await classify_intent(chat_request.message, provider, model)
            logger.info(f"Auto mode classified '{chat_request.message[:50]}...' as '{resolved_mode}'")

        # Prepare context based on mode
        context_str = ""

        if resolved_mode == "report":
            # Get current scores for report generation
            function_scores = compute_function_scores(db)
            attention_metrics = get_metrics_needing_attention(db, limit=5)
            context_str = json.dumps({
                "framework": framework,
                "function_scores": [fs.model_dump() for fs in function_scores],
                "metrics_needing_attention": attention_metrics[:3],
            })

        elif resolved_mode == "metrics" and chat_request.context_opts:
            # Get existing metrics context if requested
            if chat_request.context_opts.get("include_existing_metrics"):
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

        # Web search integration (only for explain/report modes)
        search_context = ""
        search_used = False
        if chat_request.web_search and resolved_mode in ("explain", "report"):
            try:
                from ..services.search import SearchService, SearchProvider
                tavily_key = os.getenv("TAVILY_API_KEY")
                search_provider = SearchProvider.TAVILY if tavily_key else SearchProvider.DUCKDUCKGO
                search_service = SearchService(provider=search_provider, tavily_api_key=tavily_key)
                search_query = chat_request.message[:200]
                search_response = await search_service.search(search_query, max_results=5)
                search_context = SearchService.format_results_for_context(search_response)
                if search_context:
                    search_used = True
            except Exception as e:
                logger.warning(f"Web search failed (non-fatal): {e}")

        # Build messages for provider
        system_prompt = get_system_prompt_for_mode(resolved_mode, framework)
        if search_used:
            system_prompt += "\n\nYou have been provided with web search results for additional context. Use these results to supplement your knowledge when relevant. Cite sources when using specific information from search results."

        user_message = chat_request.message
        parts = []
        if context_str:
            parts.append(f"Context:\n{context_str}")
        if search_context:
            parts.append(f"Web Search Results:\n{search_context}")
        if parts:
            parts.append(f"Request:\n{chat_request.message}")
            user_message = "\n\n".join(parts)

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
        if resolved_mode == "metrics":
            # Try to parse JSON response for metrics mode
            # Extract JSON from markdown code blocks — AI may add text after the closing fence
            content = response.content.strip()
            import re
            json_match = re.search(r'```(?:json)?\s*\n([\s\S]*?)\n\s*```', content)
            if json_match:
                content = json_match.group(1).strip()

            try:
                parsed = json.loads(content)
                ai_response = parsed
                # If the AI included explanatory text outside the JSON block,
                # append it to assistant_message so the user still sees it
                if json_match:
                    extra_text = content  # already extracted JSON portion
                    full_text = response.content.strip()
                    # Get text after the closing fence
                    after_json = full_text[json_match.end():].strip()
                    if after_json and isinstance(ai_response.get("assistant_message"), str):
                        ai_response["assistant_message"] += "\n\n" + after_json
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

        # Add search indicator and resolved mode
        ai_response["search_used"] = search_used
        ai_response["resolved_mode"] = resolved_mode

        # Log the interaction
        change_log = AIChangeLog(
            operation_type="chat",
            user_prompt=chat_request.message,
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
        logger.error(f"AI chat error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


@router.post("/actions/apply")
@limiter.limit("30/minute")
async def apply_ai_actions(
    apply_request: AIApplyRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """Apply AI-generated actions after user confirmation.

    Requires Editor or Admin role. Viewers cannot apply AI actions.
    """
    applied_by = current_user.email

    if not apply_request.user_confirmation:
        raise HTTPException(status_code=400, detail="User confirmation required")

    applied_results = []
    errors = []

    for action in apply_request.actions:
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
                
                # Create new metric - strip computed @property fields and resolve FKs
                metric_data = action.metric.model_dump()

                # Capture function/category codes before stripping
                # csf_function comes from schema (enum value like "pr"), function_code from legacy prompts
                func_code = (metric_data.get('function_code') or '').lower()
                if not func_code:
                    csf_val = metric_data.get('csf_function')
                    if csf_val:
                        # Handle both enum value ("pr") and enum name ("protect")
                        func_code = csf_val.value if hasattr(csf_val, 'value') else str(csf_val).lower()
                cat_code = (metric_data.get('csf_category_code') or '').strip()
                subcat_code = (metric_data.get('csf_subcategory_code') or '').strip()

                computed_props = [
                    'csf_function', 'csf_category_code', 'csf_subcategory_code', 'csf_category_name', 'csf_subcategory_outcome',
                    'ai_rmf_function', 'ai_rmf_function_name', 'ai_rmf_category_code', 'ai_rmf_category_name',
                    'ai_rmf_subcategory_code', 'ai_rmf_subcategory_outcome',
                ]
                for field in computed_props:
                    metric_data.pop(field, None)
                # Also strip function_code — not a DB column
                metric_data.pop('function_code', None)

                # Resolve function code to framework_id/function_id FKs
                from ..models import Framework, FrameworkFunction, FrameworkCategory, FrameworkSubcategory
                if not metric_data.get('framework_id'):
                    fw = db.query(Framework).filter(Framework.code == 'csf_2_0').first()
                    if not fw:
                        fw = db.query(Framework).first()
                    if fw:
                        if func_code:
                            func = db.query(FrameworkFunction).filter(
                                FrameworkFunction.code == func_code,
                                FrameworkFunction.framework_id == fw.id
                            ).first()
                        else:
                            # Default to first function if AI didn't specify
                            func = db.query(FrameworkFunction).filter(
                                FrameworkFunction.framework_id == fw.id
                            ).first()
                        if func:
                            metric_data['framework_id'] = func.framework_id
                            metric_data['function_id'] = func.id
                            # Resolve category
                            if cat_code:
                                category = db.query(FrameworkCategory).filter(
                                    FrameworkCategory.code == cat_code,
                                    FrameworkCategory.function_id == func.id
                                ).first()
                                if category:
                                    metric_data['category_id'] = category.id
                                    # Resolve subcategory
                                    if subcat_code:
                                        subcategory = db.query(FrameworkSubcategory).filter(
                                            FrameworkSubcategory.code == subcat_code,
                                            FrameworkSubcategory.category_id == category.id
                                        ).first()
                                        if subcategory:
                                            metric_data['subcategory_id'] = subcategory.id
                            # Generate metric_number
                            prefix = "CSF" if fw.code == 'csf_2_0' else "AIRMF"
                            func_prefix = func_code.upper() if func_code else func.code.upper()
                            existing_nums = db.query(Metric).filter(
                                Metric.metric_number.like(f"{prefix}-{func_prefix}-%")
                            ).all()
                            next_num = len(existing_nums) + 1
                            metric_data['metric_number'] = f"{prefix}-{func_prefix}-{next_num:03d}"
                        else:
                            # Fallback: assign framework_id even without function resolution
                            metric_data['framework_id'] = fw.id

                if not metric_data.get('framework_id'):
                    errors.append(f"Could not resolve framework for metric '{action.metric.name}'")
                    continue

                # Strip None values to use model defaults
                metric_data = {k: v for k, v in metric_data.items() if v is not None}

                db_metric = Metric(**metric_data)
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
                    ai_response_json={"action": action.model_dump(mode="json")},
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
                
                # Apply changes (only allow fields that are in MetricUpdate schema)
                ALLOWED_UPDATE_FIELDS = {
                    "metric_number", "name", "description", "formula", "calc_expr_json",
                    "csf_function", "csf_category_code", "csf_subcategory_code",
                    "csf_category_name", "csf_subcategory_outcome",
                    "ai_rmf_function", "ai_rmf_function_name",
                    "ai_rmf_category_code", "ai_rmf_category_name",
                    "ai_rmf_subcategory_code", "ai_rmf_subcategory_outcome",
                    "trustworthiness_characteristic",
                    "framework_id", "function_id", "category_id", "subcategory_id",
                    "priority_rank", "weight", "direction",
                    "target_value", "target_units", "tolerance_low", "tolerance_high",
                    "owner_function", "data_source", "collection_frequency",
                    "current_value", "current_label", "notes",
                    "risk_definition", "business_impact", "active",
                }
                for field, value in action.changes.items():
                    if field in ALLOWED_UPDATE_FIELDS and hasattr(metric, field):
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
                    ai_response_json={"action": action.model_dump(mode="json")},
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
                    ai_response_json={"action": action.model_dump(mode="json")},
                    applied=True,
                    applied_by=applied_by,
                    applied_at=datetime.utcnow(),
                )
                db.add(change_log)
            
            else:
                errors.append(f"Unknown action type: {action.action}")
        
        except Exception as e:
            db.rollback()
            errors.append(f"Error applying {action.action}: {str(e)}")

    try:
        db.commit()
    except Exception:
        db.rollback()
    
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI suggestions for improving metrics or scores."""
    try:
        # Get active AI provider for current user
        user_id = current_user.id
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
async def get_ai_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get AI service status and configuration."""
    # Check what provider is available
    available = False
    provider_name = None
    model = None

    try:
        # Try to get active provider for current user
        user_id = current_user.id
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
        "supported_providers": ["anthropic", "openai", "together", "azure", "bedrock", "vertex", "local"],
        "supported_modes": ["auto", "metrics", "explain", "report", "recommendations"],
        "supported_frameworks": ["csf_2_0", "ai_rmf", "cyber_ai_profile"],
    }


# ==============================================================================
# WEB SEARCH CONFIGURATION
# ==============================================================================

@router.get("/search/config")
async def get_search_config(current_user: User = Depends(get_current_user)):
    """Get web search configuration status."""
    tavily_key = os.getenv("TAVILY_API_KEY")
    return {
        "search_available": True,  # DuckDuckGo always available
        "default_provider": "tavily" if tavily_key else "duckduckgo",
        "tavily_configured": bool(tavily_key),
        "providers": [
            {"code": "duckduckgo", "name": "DuckDuckGo", "requires_key": False, "available": True},
            {"code": "tavily", "name": "Tavily", "requires_key": True, "available": bool(tavily_key)},
        ],
    }


# ==============================================================================
# RECOMMENDATIONS ENDPOINTS
# ==============================================================================

@router.post("/recommendations")
async def get_ai_recommendations(
    framework: str = Query("csf_2_0", description="Framework code"),
    max_recommendations: int = Query(10, ge=1, le=25, description="Maximum recommendations"),
    current_user: User = Depends(get_current_user),
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
        user_id = current_user.id
        provider = await get_active_provider(db, user_id)
    except HTTPException:
        # No provider configured — return 200 with empty results, not 503
        return {
            "success": False,
            "ai_available": False,
            "recommendations": [],
            "gap_analysis": {},
            "framework_code": framework,
            "error": "No AI provider configured. Configure one in Settings > AI Configuration.",
        }

    result = await generate_metric_recommendations(db, framework, max_recommendations, provider=provider)

    # Always return the result as 200 — the client handles {success: false}
    result["ai_available"] = True
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Suggest specific metrics to fill a particular coverage gap.

    Optionally focus on a specific function or category to get targeted suggestions.
    """
    try:
        user_id = current_user.id
        provider = await get_active_provider(db, user_id)
    except HTTPException:
        return {
            "success": False,
            "ai_available": False,
            "suggestions": [],
            "framework_code": framework,
            "error": "No AI provider configured. Configure one in Settings > AI Configuration.",
        }

    result = await suggest_metrics_for_gap(
        db, framework, function_code, category_code, count, provider=provider
    )

    result["ai_available"] = True
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
        user_id = current_user.id
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