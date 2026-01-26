"""API endpoints for scoring and risk assessment.

Supports multi-framework scoring with backward compatibility for CSF 2.0.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import FunctionScore, ScoresResponse, CategoryScore, CategoryScoresResponse, CategoryDetailScore
from ..services.scoring import (
    compute_function_scores,
    compute_overall_score,
    get_metrics_needing_attention,
    recalculate_all_scores,
    compute_category_scores,
    compute_category_score,
    get_category_metrics_summary,
    get_runtime_thresholds,
    save_thresholds_to_db,
    # Multi-framework scoring functions
    compute_framework_function_scores,
    compute_framework_category_scores,
    compute_framework_overall_score,
    get_framework_metrics_needing_attention,
    get_framework_coverage,
)
from ..services.catalog_scoring import get_catalog_scoring_service

router = APIRouter()


def _get_function_name(function_code: str) -> str:
    """Get human-readable name for function code."""
    function_names = {
        "gv": "Govern",
        "id": "Identify", 
        "pr": "Protect",
        "de": "Detect",
        "rs": "Respond",
        "rc": "Recover"
    }
    return function_names.get(function_code, function_code.upper())


@router.get("/", response_model=ScoresResponse)
async def get_current_scores(
    catalog_id: Optional[UUID] = Query(None, description="Catalog ID to use for scoring"),
    owner: Optional[str] = Query(None, description="Owner to get active catalog for"),
    db: Session = Depends(get_db)
):
    """
    Get current risk scores for all CSF functions.
    
    This endpoint returns the main dashboard data including:
    - Score and risk rating for each CSF function
    - Overall organizational score
    - Timestamp of calculation
    
    If catalog_id is provided, uses that catalog. If owner is provided, 
    uses the active catalog for that owner. Otherwise uses default metrics.
    """
    # Use catalog-aware scoring service
    scoring_service = get_catalog_scoring_service(db)
    function_scores = scoring_service.compute_function_scores(catalog_id, owner)
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


@router.get("/functions/{function_code}/categories", response_model=CategoryScoresResponse)
async def get_function_categories(
    function_code: str,
    catalog_id: Optional[UUID] = Query(None, description="Catalog ID to use for scoring"),
    owner: Optional[str] = Query(None, description="Owner to get active catalog for"),
    db: Session = Depends(get_db),
):
    """Get category scores for a specific CSF function."""
    
    # Validate function code
    valid_functions = ["gv", "id", "pr", "de", "rs", "rc"]
    if function_code not in valid_functions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid function code. Must be one of: {valid_functions}"
        )
    
    # Get category scores using catalog-aware service
    scoring_service = get_catalog_scoring_service(db)
    category_scores_data = scoring_service.compute_category_scores(function_code, catalog_id, owner)
    
    if not category_scores_data:
        return CategoryScoresResponse(
            function_code=function_code,
            function_name=_get_function_name(function_code),
            category_scores=[],
            total_categories=0,
            last_updated=datetime.utcnow()
        )
    
    # Convert to Pydantic models
    category_scores = []
    for cat_data in category_scores_data:
        category_scores.append(CategoryScore(
            category_code=cat_data['category_code'],
            category_name=cat_data['category_name'],
            category_description=cat_data['category_description'],
            score_pct=cat_data['score_pct'],
            risk_rating=cat_data['risk_rating'],
            metrics_count=cat_data['metrics_count'],
            metrics_below_target_count=cat_data['metrics_below_target_count'],
            weighted_score=cat_data['weighted_score'],
        ))
    
    return CategoryScoresResponse(
        function_code=function_code,
        function_name=_get_function_name(function_code),
        category_scores=category_scores,
        total_categories=len(category_scores),
        last_updated=datetime.utcnow()
    )


@router.get("/categories/{category_code}", response_model=CategoryDetailScore)
async def get_category_details(
    category_code: str,
    db: Session = Depends(get_db),
):
    """Get detailed score and metrics for a specific category."""
    
    category_data = compute_category_score(db, category_code)
    
    if not category_data:
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category_code}' not found or has no metrics"
        )
    
    return CategoryDetailScore(
        category_code=category_data['category_code'],
        category_name=category_data['category_name'],
        category_description=category_data['category_description'],
        score_pct=category_data['score_pct'],
        risk_rating=category_data['risk_rating'],
        metrics_count=category_data['metrics_count'],
        metrics_below_target_count=category_data['metrics_below_target_count'],
        weighted_score=category_data['weighted_score'],
        metrics=category_data['metrics'],
    )


@router.get("/metrics/attention")
async def get_metrics_attention_endpoint(
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
async def get_dashboard_summary(
    catalog_id: Optional[UUID] = Query(None, description="Catalog ID to use for scoring"),
    owner: Optional[str] = Query(None, description="Owner to get active catalog for"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard summary with all key metrics.
    
    This endpoint provides all the data needed for the executive dashboard
    including function scores, overall score, and metrics needing attention.
    """
    # Use catalog-aware scoring service
    scoring_service = get_catalog_scoring_service(db)
    function_scores = scoring_service.compute_function_scores(catalog_id, owner)
    overall_score_pct, overall_risk_rating = compute_overall_score(function_scores)
    attention_metrics = get_metrics_needing_attention(db, limit=5)  # TODO: Make this catalog-aware
    
    # Calculate some additional summary stats
    total_metrics = sum(fs.metrics_count for fs in function_scores)
    total_below_target = sum(fs.metrics_below_target_count for fs in function_scores)
    
    # Count risk ratings (5-level system)
    risk_counts = {"very_low": 0, "low": 0, "medium": 0, "high": 0, "very_high": 0}
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
async def get_risk_thresholds(db: Session = Depends(get_db)):
    """Get current risk rating thresholds."""
    t = get_runtime_thresholds(db)
    return {
        "thresholds": t,
        "description": {
            "very_low": f"≥{t['very_low']}% - Very low risk, excellent performance",
            "low": f"{t['low']}-{t['very_low'] - 1}% - Low risk, good performance",
            "medium": f"{t['medium']}-{t['low'] - 1}% - Medium risk, moderate gaps",
            "high": f"{t['high']}-{t['medium'] - 1}% - High risk, significant gaps",
            "very_high": f"<{t['high']}% - Very high risk, critical gaps",
        },
    }


@router.put("/thresholds")
async def update_risk_thresholds(body: dict, db: Session = Depends(get_db)):
    """Update risk rating thresholds and persist to database."""
    thresholds = body.get("thresholds", {})
    valid_keys = {"very_low", "low", "medium", "high"}
    update = {}
    for key in valid_keys:
        if key in thresholds:
            update[key] = float(thresholds[key])
    if update:
        saved = save_thresholds_to_db(db, update)
    else:
        saved = get_runtime_thresholds(db)
    return {"status": "ok", "thresholds": saved}


# ==============================================================================
# MULTI-FRAMEWORK SCORING ENDPOINTS
# ==============================================================================

@router.get("/framework/{framework_code}")
async def get_framework_scores(
    framework_code: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get scores for any supported framework (CSF 2.0, AI RMF, etc.).

    Returns function scores, overall score, and framework-specific metrics.
    """
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework_code not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework code. Must be one of: {valid_frameworks}"
        )

    overall_result = compute_framework_overall_score(db, framework_code)

    if not overall_result:
        return {
            "framework_code": framework_code,
            "function_scores": [],
            "overall_score_pct": 0,
            "overall_risk_rating": "very_high",
            "total_metrics": 0,
            "metrics_with_data": 0,
            "last_updated": datetime.utcnow().isoformat(),
        }

    return {
        "framework_code": framework_code,
        "function_scores": overall_result.get("function_scores", []),
        "overall_score_pct": overall_result.get("overall_score_pct", 0),
        "overall_risk_rating": overall_result.get("overall_risk_rating", "very_high"),
        "total_metrics": overall_result.get("total_metrics", 0),
        "metrics_with_data": overall_result.get("metrics_with_data", 0),
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.get("/framework/{framework_code}/functions")
async def get_framework_function_scores_endpoint(
    framework_code: str,
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get function-level scores for a specific framework.

    Returns scores for each function/focus area within the framework.
    """
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework_code not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework code. Must be one of: {valid_frameworks}"
        )

    scores = compute_framework_function_scores(db, framework_code)
    return scores


@router.get("/framework/{framework_code}/functions/{function_code}/categories")
async def get_framework_category_scores_endpoint(
    framework_code: str,
    function_code: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get category-level scores for a specific function within a framework.
    """
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework_code not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework code. Must be one of: {valid_frameworks}"
        )

    category_scores = compute_framework_category_scores(db, framework_code, function_code)

    if not category_scores:
        return {
            "framework_code": framework_code,
            "function_code": function_code,
            "category_scores": [],
            "total_categories": 0,
            "last_updated": datetime.utcnow().isoformat(),
        }

    return {
        "framework_code": framework_code,
        "function_code": function_code,
        "category_scores": category_scores,
        "total_categories": len(category_scores),
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.get("/framework/{framework_code}/coverage")
async def get_framework_coverage_endpoint(
    framework_code: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get metric coverage statistics for a framework.

    Shows how many metrics exist for each function/category.
    """
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework_code not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework code. Must be one of: {valid_frameworks}"
        )

    coverage = get_framework_coverage(db, framework_code)

    if not coverage:
        return {
            "framework_code": framework_code,
            "total_metrics": 0,
            "functions": [],
            "coverage_summary": "No metrics found for this framework",
        }

    return coverage


@router.get("/framework/{framework_code}/attention")
async def get_framework_attention_metrics(
    framework_code: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get metrics needing attention for a specific framework.

    Returns metrics with lowest scores or missing data.
    """
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework_code not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework code. Must be one of: {valid_frameworks}"
        )

    metrics = get_framework_metrics_needing_attention(db, framework_code, limit)
    return metrics