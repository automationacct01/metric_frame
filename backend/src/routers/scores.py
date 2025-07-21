"""API endpoints for scoring and risk assessment."""

from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import FunctionScore, ScoresResponse
from ..services.scoring import (
    compute_function_scores,
    compute_overall_score,
    get_metrics_needing_attention,
    recalculate_all_scores,
)

router = APIRouter()


@router.get("/", response_model=ScoresResponse)
async def get_current_scores(db: Session = Depends(get_db)):
    """
    Get current risk scores for all CSF functions.
    
    This endpoint returns the main dashboard data including:
    - Score and risk rating for each CSF function
    - Overall organizational score
    - Timestamp of calculation
    """
    function_scores = compute_function_scores(db)
    overall_score_pct, overall_risk_rating = compute_overall_score(function_scores)
    
    return ScoresResponse(
        function_scores=function_scores,
        overall_score=overall_score_pct,
        overall_risk_rating=overall_risk_rating,
        last_updated=datetime.utcnow(),
    )


@router.get("/functions/{function_code}", response_model=FunctionScore)
async def get_function_score(
    function_code: str,
    db: Session = Depends(get_db),
):
    """Get detailed score for a specific CSF function."""
    
    # Validate function code
    valid_functions = ["gv", "id", "pr", "de", "rs", "rc"]
    if function_code not in valid_functions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid function code. Must be one of: {valid_functions}"
        )
    
    function_scores = compute_function_scores(db)
    
    for score in function_scores:
        if score.function.value == function_code:
            return score
    
    raise HTTPException(status_code=404, detail="Function score not found")


@router.get("/metrics/attention")
async def get_metrics_needing_attention(
    limit: int = 10,
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get metrics that need attention (lowest scoring, highest priority).
    
    This endpoint helps identify which metrics are furthest from target
    and should be prioritized for improvement efforts.
    """
    return get_metrics_needing_attention(db, limit)


@router.get("/dashboard/summary")
async def get_dashboard_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get comprehensive dashboard summary with all key metrics.
    
    This endpoint provides all the data needed for the executive dashboard
    including function scores, overall score, and metrics needing attention.
    """
    function_scores = compute_function_scores(db)
    overall_score_pct, overall_risk_rating = compute_overall_score(function_scores)
    attention_metrics = get_metrics_needing_attention(db, limit=5)
    
    # Calculate some additional summary stats
    total_metrics = sum(fs.metrics_count for fs in function_scores)
    total_below_target = sum(fs.metrics_below_target_count for fs in function_scores)
    
    # Count risk ratings
    risk_counts = {"low": 0, "moderate": 0, "elevated": 0, "high": 0}
    for fs in function_scores:
        risk_counts[fs.risk_rating.value] += 1
    
    return {
        "function_scores": [fs.model_dump() for fs in function_scores],
        "overall_score_pct": overall_score_pct,
        "overall_risk_rating": overall_risk_rating.value,
        "total_metrics": total_metrics,
        "metrics_below_target": total_below_target,
        "metrics_at_target_pct": round(
            ((total_metrics - total_below_target) / total_metrics) * 100, 1
        ) if total_metrics > 0 else 0,
        "risk_distribution": risk_counts,
        "metrics_needing_attention": attention_metrics,
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.get("/trends/function/{function_code}")
async def get_function_trend(
    function_code: str,
    days: int = 30,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get historical trend data for a specific function.
    
    Note: This is a placeholder for future implementation when we have
    historical scoring data stored in the database.
    """
    # Validate function code
    valid_functions = ["gv", "id", "pr", "de", "rs", "rc"]
    if function_code not in valid_functions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid function code. Must be one of: {valid_functions}"
        )
    
    # For now, return mock trend data
    # In a real implementation, this would query historical scores
    return {
        "function_code": function_code,
        "trend_data": [
            {"date": "2024-01-01", "score_pct": 78.5},
            {"date": "2024-01-08", "score_pct": 80.1},
            {"date": "2024-01-15", "score_pct": 82.3},
            {"date": "2024-01-22", "score_pct": 81.7},
            {"date": "2024-01-29", "score_pct": 83.9},
        ],
        "period_days": days,
        "note": "Historical trend data not yet implemented - showing sample data",
    }


@router.post("/recalculate")
async def recalculate_scores(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Recalculate all scores and return updated results.
    
    This endpoint can be called after making changes to weights,
    targets, or other scoring parameters to refresh all calculations.
    """
    try:
        result = recalculate_all_scores(db)
        return {
            "message": "Scores recalculated successfully",
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recalculating scores: {str(e)}")


@router.get("/thresholds")
async def get_risk_thresholds():
    """Get current risk rating thresholds."""
    import os
    
    return {
        "thresholds": {
            "low": float(os.getenv("RISK_THRESHOLD_LOW", "85.0")),
            "moderate": float(os.getenv("RISK_THRESHOLD_MODERATE", "65.0")),
            "elevated": float(os.getenv("RISK_THRESHOLD_ELEVATED", "40.0")),
        },
        "description": {
            "low": "≥85% - Low risk, good performance",
            "moderate": "65-84% - Moderate risk, some gaps",
            "elevated": "40-64% - Elevated risk, significant gaps", 
            "high": "<40% - High risk, major gaps",
        },
        "note": "Thresholds can be configured via environment variables",
    }