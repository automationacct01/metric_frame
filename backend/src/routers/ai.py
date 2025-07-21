"""AI assistant API endpoints."""

from datetime import datetime
from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
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
from ..services.ai_client import ai_client
from ..services.scoring import compute_function_scores, get_metrics_needing_attention

router = APIRouter()


@router.post("/chat", response_model=AIResponse)
async def ai_chat(
    request: AIChatRequest,
    db: Session = Depends(get_db),
):
    """
    Chat with AI assistant for metrics management and explanation.
    
    Modes:
    - metrics: Generate or modify metrics (returns structured actions)
    - explain: Explain metrics, scoring, or risk concepts
    - report: Generate executive narrative from current scores
    """
    
    if not ai_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI service is not available. Please check API key configuration."
        )
    
    try:
        # Prepare context based on mode
        context = None
        
        if request.mode == "report":
            # Get current scores for report generation
            function_scores = compute_function_scores(db)
            attention_metrics = get_metrics_needing_attention(db, limit=5)
            context = {
                "function_scores": [fs.model_dump() for fs in function_scores],
                "metrics_needing_attention": attention_metrics[:3],  # Top 3 for context
            }
        
        elif request.mode == "metrics" and request.context_opts:
            # Get existing metrics context if requested
            if request.context_opts.get("include_existing_metrics"):
                existing_metrics = db.query(Metric).filter(Metric.active == True).limit(20).all()
                context = {
                    "existing_metrics": [
                        {"name": m.name, "function": m.csf_function.value, "description": m.description}
                        for m in existing_metrics
                    ]
                }
        
        # Generate AI response
        ai_response = await ai_client.generate_response(
            message=request.message,
            mode=request.mode,
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
    function_code: str = None,
    db: Session = Depends(get_db),
):
    """Get AI suggestions for improving metrics or scores."""
    
    if not ai_client.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI service is not available"
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
            "function_scores": [fs.model_dump() for fs in function_scores],
            "metrics_needing_attention": attention_metrics,
        }
        
        message = f"Based on the current metrics performance, what are the top 3 improvement recommendations for {'function ' + function_code if function_code else 'overall cybersecurity posture'}?"
        
        ai_response = await ai_client.generate_response(
            message=message,
            mode="explain",
            context=context
        )
        
        return {
            "recommendations": ai_response["assistant_message"],
            "based_on": {
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
        "available": ai_client.is_available(),
        "model": ai_client.model,
        "has_openai": bool(ai_client.openai_client),
        "has_anthropic": bool(ai_client.anthropic_client),
        "supported_modes": ["metrics", "explain", "report"],
    }