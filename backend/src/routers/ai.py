"""AI assistant API endpoints using Claude Sonnet 4.5.

This router provides AI-powered features:
- Chat-based metrics management
- Framework-aware explanations and reports
- AI metric recommendations
- Metric enhancement suggestions
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Metric, AIChangeLog
from ..schemas import (
    AIChatRequest,
    AIResponse,
    AIApplyRequest,
    AIChangeLogResponse,
    MetricCreate,
    MetricUpdate,
)
from ..services.claude_client import claude_client
from ..services.scoring import compute_function_scores, get_metrics_needing_attention
from ..services.metric_recommendations import (
    generate_metric_recommendations,
    get_coverage_gaps,
    suggest_metrics_for_gap,
    get_metric_distribution,
)

router = APIRouter()


@router.post("/chat", response_model=AIResponse)
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

    if not claude_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="Claude AI service is not available. Please check ANTHROPIC_API_KEY configuration."
        )

    # Validate framework
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework. Must be one of: {valid_frameworks}"
        )

    try:
        # Prepare context based on mode
        context = None

        if request.mode == "report":
            # Get current scores for report generation
            function_scores = compute_function_scores(db)
            attention_metrics = get_metrics_needing_attention(db, limit=5)
            context = {
                "framework": framework,
                "function_scores": [fs.model_dump() for fs in function_scores],
                "metrics_needing_attention": attention_metrics[:3],  # Top 3 for context
            }

        elif request.mode == "metrics" and request.context_opts:
            # Get existing metrics context if requested
            if request.context_opts.get("include_existing_metrics"):
                existing_metrics = db.query(Metric).filter(Metric.active == True).limit(20).all()
                context = {
                    "framework": framework,
                    "existing_metrics": [
                        {
                            "name": m.name,
                            "function": m.csf_function.value if m.csf_function else "unknown",
                            "description": m.description
                        }
                        for m in existing_metrics
                    ]
                }

        # Generate AI response using Claude
        ai_response = await claude_client.generate_response(
            message=request.message,
            mode=request.mode,
            framework=framework,
            context=context
        )

        # Log the interaction
        change_log = AIChangeLog(
            user_prompt=request.message,
            ai_response_json=ai_response,
            applied=False,
        )
        db.add(change_log)
        db.commit()

        return AIResponse(**ai_response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


@router.post("/actions/apply")
async def apply_ai_actions(
    request: AIApplyRequest,
    applied_by: str = "system",  # In future, get from auth
    db: Session = Depends(get_db),
):
    """Apply AI-generated actions after user confirmation."""
    
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

    if not claude_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="Claude AI service is not available"
        )

    try:
        # Get current performance data
        function_scores = compute_function_scores(db)
        attention_metrics = get_metrics_needing_attention(db, limit=10)

        # Filter by function if specified
        if function_code:
            function_scores = [fs for fs in function_scores if fs.function.value == function_code]
            attention_metrics = [m for m in attention_metrics if m["csf_function"] == function_code]

        # Generate improvement suggestions
        context = {
            "framework": framework,
            "function_scores": [fs.model_dump() for fs in function_scores],
            "metrics_needing_attention": attention_metrics,
        }

        message = f"Based on the current metrics performance, what are the top 3 improvement recommendations for {'function ' + function_code if function_code else 'overall cybersecurity posture'}?"

        ai_response = await claude_client.generate_response(
            message=message,
            mode="explain",
            framework=framework,
            context=context
        )

        return {
            "recommendations": ai_response["assistant_message"],
            "based_on": {
                "framework": framework,
                "function_count": len(function_scores),
                "metrics_analyzed": len(attention_metrics),
                "focus_function": function_code,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


@router.get("/status")
async def get_ai_status():
    """Get AI service status and configuration."""

    return {
        "available": claude_client.is_available(),
        "model": claude_client.model,
        "provider": "anthropic",
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
    if not claude_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="Claude AI service is not available"
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
    if not claude_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="Claude AI service is not available"
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
    db: Session = Depends(get_db),
):
    """
    Generate a complete metric definition from just the metric name using AI.

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
    if not claude_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="Claude AI service is not available. Please check ANTHROPIC_API_KEY configuration."
        )

    # Get framework functions and categories for context
    from ..models import Framework, FrameworkFunction, FrameworkCategory

    fw = db.query(Framework).filter(Framework.code == framework).first()
    if not fw:
        raise HTTPException(status_code=404, detail=f"Framework '{framework}' not found")

    functions = db.query(FrameworkFunction).filter(FrameworkFunction.framework_id == fw.id).all()

    # Build function and category info for the AI prompt
    function_info = []
    category_info = []
    for func in functions:
        function_info.append(f"{func.code.upper()} ({func.name})")
        categories = db.query(FrameworkCategory).filter(FrameworkCategory.function_id == func.id).all()
        for cat in categories:
            category_info.append(f"{cat.code} ({cat.name}) - under {func.code.upper()}")

    try:
        # Use Claude directly for simpler, more controlled response
        from anthropic import Anthropic
        client = Anthropic(api_key=claude_client.api_key)

        system_prompt = f"""You are a cybersecurity metrics expert. Generate metric definitions for {fw.name}.

Available framework functions: {', '.join(function_info)}

Available categories:
{chr(10).join(category_info[:30])}

IMPORTANT: Respond with ONLY a valid JSON object, no markdown, no explanation, no code blocks. Just the raw JSON."""

        user_prompt = f"""Generate a complete metric definition for: "{metric_name}"

Return this exact JSON structure (fill in appropriate values):
{{"name": "{metric_name}", "description": "description here", "csf_function": "function_code", "csf_category_code": "XX.YY", "priority_rank": 1, "direction": "higher_is_better", "target_value": 95, "target_units": "percent", "current_value": null, "owner_function": "owner here", "collection_frequency": "monthly", "formula": "calculation formula here", "risk_definition": "why this metric matters", "notes": null}}

Rules:
- csf_function must be one of: {', '.join([f.code for f in functions])}
- csf_category_code must be a valid category code (like GV.OC, PR.AA, DE.CM, etc.)
- priority_rank: 1=High, 2=Medium, 3=Low
- direction: higher_is_better, lower_is_better, target_range, or binary
- target_units: percent, hours, days, count, or similar
- collection_frequency: daily, weekly, monthly, quarterly, or ad_hoc
- formula: REQUIRED - provide a clear calculation formula (e.g., "Patched Systems / Total Systems")
- risk_definition: REQUIRED - explain why an organization needs to track this metric and what business risk it addresses (1-2 sentences)"""

        response = client.messages.create(
            model=claude_client.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        # Extract text response
        response_text = response.content[0].text.strip()

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
            if csf_category_code:
                category = db.query(FrameworkCategory).filter(
                    FrameworkCategory.code == csf_category_code,
                    FrameworkCategory.function_id == func.id
                ).first()
                if category:
                    metric_data["category_id"] = str(category.id)

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

    except json.JSONDecodeError as e:
        # Return partial data if JSON parsing fails
        return {
            "success": False,
            "error": f"Failed to parse AI response: {str(e)}",
            "raw_response": response_text if 'response_text' in dir() else "",
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