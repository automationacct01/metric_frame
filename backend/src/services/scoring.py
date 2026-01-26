"""Multi-framework scoring service with gap-to-target calculations.

Supports:
- NIST CSF 2.0 (with Cyber AI Profile)
- NIST AI RMF 1.0
- Future frameworks via database
"""

import os
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from ..models import (
    Metric,
    CSFFunction,
    MetricDirection,
    Framework,
    FrameworkFunction,
    FrameworkCategory,
)
from ..schemas import FunctionScore, RiskRating
from .csf_reference import CSFReferenceService


# Runtime threshold cache - loaded from DB, falls back to env vars
_runtime_thresholds: Dict[str, float] = {
    "very_low": float(os.getenv("RISK_THRESHOLD_VERY_LOW", "90.0")),
    "low": float(os.getenv("RISK_THRESHOLD_LOW", "75.0")),
    "medium": float(os.getenv("RISK_THRESHOLD_MEDIUM", "50.0")),
    "high": float(os.getenv("RISK_THRESHOLD_HIGH", "30.0")),
}
_thresholds_loaded = False


def load_thresholds_from_db(db: Session) -> Dict[str, float]:
    """Load thresholds from database, updating the runtime cache."""
    global _thresholds_loaded
    from ..models import AppSettings
    row = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if row:
        _runtime_thresholds["very_low"] = float(row.risk_threshold_very_low)
        _runtime_thresholds["low"] = float(row.risk_threshold_low)
        _runtime_thresholds["medium"] = float(row.risk_threshold_medium)
        _runtime_thresholds["high"] = float(row.risk_threshold_high)
    _thresholds_loaded = True
    return dict(_runtime_thresholds)


def save_thresholds_to_db(db: Session, thresholds: Dict[str, float]) -> Dict[str, float]:
    """Save thresholds to database and update runtime cache."""
    from ..models import AppSettings
    row = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not row:
        row = AppSettings(id=1)
        db.add(row)
    if "very_low" in thresholds:
        row.risk_threshold_very_low = thresholds["very_low"]
    if "low" in thresholds:
        row.risk_threshold_low = thresholds["low"]
    if "medium" in thresholds:
        row.risk_threshold_medium = thresholds["medium"]
    if "high" in thresholds:
        row.risk_threshold_high = thresholds["high"]
    db.commit()
    db.refresh(row)
    _runtime_thresholds["very_low"] = float(row.risk_threshold_very_low)
    _runtime_thresholds["low"] = float(row.risk_threshold_low)
    _runtime_thresholds["medium"] = float(row.risk_threshold_medium)
    _runtime_thresholds["high"] = float(row.risk_threshold_high)
    return dict(_runtime_thresholds)


def get_runtime_thresholds(db: Optional[Session] = None) -> Dict[str, float]:
    """Get current thresholds, loading from DB on first call if a session is provided."""
    global _thresholds_loaded
    if not _thresholds_loaded and db:
        return load_thresholds_from_db(db)
    return dict(_runtime_thresholds)


def compute_metric_score(metric: Metric) -> Optional[float]:
    """
    Compute performance score for a single metric based on gap-to-target methodology.
    
    Returns:
        Float between 0.0 and 1.0, or None if unable to calculate
    """
    if metric.current_value is None or not metric.active:
        return None
    
    current = float(metric.current_value)
    target = float(metric.target_value) if metric.target_value else None
    
    if metric.direction == MetricDirection.BINARY:
        # Binary metrics: 1 if true/met, 0 otherwise
        return 1.0 if bool(current) else 0.0
    
    if target is None:
        # Can't calculate score without target
        return None
    
    if metric.direction == MetricDirection.HIGHER_IS_BETTER:
        # Higher values are better (e.g., compliance percentage)
        score = min(1.0, max(0.0, current / target)) if target > 0 else 0.0
        
    elif metric.direction == MetricDirection.LOWER_IS_BETTER:
        # Lower values are better (e.g., incident count, MTTD)
        # Score = target/current, so approaching target from above increases score
        # At target: 100%, at 2x target: 50%, at 4x target: 25%, etc.
        if current == 0:
            score = 1.0  # At or below target (0 is best possible)
        elif target == 0:
            score = 0.01  # Target is 0 but we have some value - minimal score
        else:
            score = min(1.0, target / current)
            
    elif metric.direction == MetricDirection.TARGET_RANGE:
        # Value should be within tolerance range
        low = float(metric.tolerance_low) if metric.tolerance_low else target
        high = float(metric.tolerance_high) if metric.tolerance_high else target
        
        if low <= current <= high:
            score = 1.0
        else:
            # Linear penalty outside range (2x distance from range -> 0)
            distance = min(abs(current - low), abs(current - high))
            range_span = max(high - low, 1.0)  # Avoid division by zero
            penalty_factor = min(2.0, distance / range_span)
            score = max(0.0, 1.0 - penalty_factor)
    else:
        return None
    
    return score


def compute_gap_to_target(metric: Metric) -> Optional[float]:
    """
    Compute gap to target for a metric.
    
    Returns:
        Gap as percentage (negative means below target, positive means above)
    """
    if (metric.current_value is None or 
        metric.target_value is None or 
        not metric.active or 
        metric.direction == MetricDirection.BINARY):
        return None
    
    current = float(metric.current_value)
    target = float(metric.target_value)
    
    if target == 0:
        return None
    
    gap_pct = ((current - target) / target) * 100
    
    # Adjust sign based on direction
    if metric.direction == MetricDirection.LOWER_IS_BETTER:
        gap_pct = -gap_pct  # Flip sign for lower-is-better metrics
    
    return gap_pct


def get_risk_rating(score_pct: float) -> RiskRating:
    """
    Map function score percentage to risk rating using configurable 5-level thresholds.
    """
    t = _runtime_thresholds

    if score_pct >= t["very_low"]:
        return RiskRating.VERY_LOW
    elif score_pct >= t["low"]:
        return RiskRating.LOW
    elif score_pct >= t["medium"]:
        return RiskRating.MEDIUM
    elif score_pct >= t["high"]:
        return RiskRating.HIGH
    else:
        return RiskRating.VERY_HIGH


def compute_function_scores(db: Session) -> List[FunctionScore]:
    """
    Compute scores for all CSF functions using weighted gap-to-target methodology.
    
    Returns:
        List of FunctionScore objects with computed scores and risk ratings
    """
    function_scores = []
    
    for csf_function in CSFFunction:
        # Get all active metrics for this function
        metrics = (
            db.query(Metric)
            .join(FrameworkFunction, Metric.function_id == FrameworkFunction.id)
            .filter(FrameworkFunction.code == csf_function.value)
            .filter(Metric.active == True)
            .all()
        )
        
        if not metrics:
            # No metrics for this function
            function_scores.append(FunctionScore(
                function=csf_function,
                score_pct=0.0,
                risk_rating=RiskRating.VERY_HIGH,
                metrics_count=0,
                metrics_below_target_count=0,
                weighted_score=0.0,
            ))
            continue
        
        # Compute weighted score
        total_weight = 0.0
        weighted_sum = 0.0
        metrics_below_target = 0
        scoreable_metrics = 0
        
        for metric in metrics:
            weight = float(metric.weight or 1.0)
            score = compute_metric_score(metric)
            
            if score is not None:
                scoreable_metrics += 1
                total_weight += weight
                weighted_sum += score * weight
                
                # Count metrics below target (score < 0.9 is considered below target)
                if score < 0.9:
                    metrics_below_target += 1
        
        if total_weight == 0 or scoreable_metrics == 0:
            # No scoreable metrics
            weighted_score = 0.0
            score_pct = 0.0
        else:
            weighted_score = weighted_sum / total_weight
            score_pct = weighted_score * 100
        
        risk_rating = get_risk_rating(score_pct)
        
        function_scores.append(FunctionScore(
            function=csf_function,
            score_pct=round(score_pct, 1),
            risk_rating=risk_rating,
            metrics_count=len(metrics),
            metrics_below_target_count=metrics_below_target,
            weighted_score=round(weighted_score, 3),
        ))
    
    return function_scores


def compute_overall_score(function_scores: List[FunctionScore]) -> Tuple[float, RiskRating]:
    """
    Compute overall organizational score across all functions.
    
    Args:
        function_scores: List of function scores
        
    Returns:
        Tuple of (overall_score_pct, overall_risk_rating)
    """
    if not function_scores:
        return 0.0, RiskRating.VERY_HIGH
    
    # Filter out functions with no metrics
    valid_scores = [fs for fs in function_scores if fs.metrics_count > 0]
    
    if not valid_scores:
        return 0.0, RiskRating.VERY_HIGH
    
    # Simple average across functions (could be weighted by function importance)
    total_score = sum(fs.weighted_score for fs in valid_scores)
    overall_weighted_score = total_score / len(valid_scores)
    overall_score_pct = overall_weighted_score * 100
    
    overall_risk_rating = get_risk_rating(overall_score_pct)
    
    return round(overall_score_pct, 1), overall_risk_rating


def get_metrics_needing_attention(db: Session, limit: int = 10) -> List[Dict]:
    """
    Get metrics that need attention (lowest scoring, highest priority).
    
    Args:
        db: Database session
        limit: Maximum number of metrics to return
        
    Returns:
        List of metric dictionaries with scores and gaps
    """
    metrics = (
        db.query(Metric)
        .filter(Metric.active == True)
        .filter(Metric.current_value != None)
        .all()
    )
    
    scored_metrics = []
    for metric in metrics:
        score = compute_metric_score(metric)
        gap = compute_gap_to_target(metric)
        
        if score is not None:
            func_code = metric.function.code if metric.function else "unknown"
            scored_metrics.append({
                "id": str(metric.id),
                "metric_number": metric.metric_number,
                "name": metric.name,
                "csf_function": func_code,
                "priority_rank": metric.priority_rank,
                "score": score,
                "score_pct": score * 100,
                "gap_to_target_pct": gap,
                "current_value": float(metric.current_value),
                "target_value": float(metric.target_value) if metric.target_value else None,
                "current_label": metric.current_label,
                "owner_function": metric.owner_function,
            })
    
    # Sort by priority (1=high) and score (low scores first)
    scored_metrics.sort(key=lambda x: (x["priority_rank"], x["score"]))
    
    return scored_metrics[:limit]


def compute_category_scores(db: Session, function_code: str) -> List[Dict]:
    """
    Compute scores for all categories within a specific CSF function.
    
    Args:
        db: Database session
        function_code: Two-letter function code (e.g., 'pr', 'id')
        
    Returns:
        List of category score dictionaries
    """
    try:
        csf_function = CSFFunction(function_code)
    except ValueError:
        return []
    
    # Initialize CSF reference service for category descriptions
    csf_service = CSFReferenceService()
    
    # Get all active metrics for this function with category codes
    metrics = (
        db.query(Metric)
        .join(FrameworkFunction, Metric.function_id == FrameworkFunction.id)
        .filter(FrameworkFunction.code == csf_function.value)
        .filter(Metric.active == True)
        .filter(Metric.category_id != None)
        .all()
    )

    if not metrics:
        return []

    # Group metrics by category
    category_groups = {}
    for metric in metrics:
        category_code = metric.category.code if metric.category else None
        if category_code not in category_groups:
            # Get category description from CSF reference service
            csf_category = csf_service.get_category(category_code)
            category_description = csf_category.description if csf_category else None
            
            category_groups[category_code] = {
                'code': category_code,
                'name': metric.csf_category_name or (csf_category.name if csf_category else category_code),
                'description': category_description,
                'metrics': []
            }
        category_groups[category_code]['metrics'].append(metric)
    
    # Compute scores for each category
    category_scores = []
    for category_code, category_data in category_groups.items():
        metrics_list = category_data['metrics']
        
        # Calculate weighted score for this category
        total_weight = 0.0
        weighted_sum = 0.0
        metrics_below_target = 0
        scoreable_metrics = 0
        
        for metric in metrics_list:
            weight = float(metric.weight or 1.0)
            score = compute_metric_score(metric)
            
            if score is not None:
                scoreable_metrics += 1
                total_weight += weight
                weighted_sum += score * weight
                
                # Count metrics below target (score < 0.9 is considered below target)
                if score < 0.9:
                    metrics_below_target += 1
        
        if total_weight == 0 or scoreable_metrics == 0:
            weighted_score = 0.0
            score_pct = 0.0
        else:
            weighted_score = weighted_sum / total_weight
            score_pct = weighted_score * 100
        
        risk_rating = get_risk_rating(score_pct)
        
        category_scores.append({
            'category_code': category_code,
            'category_name': category_data['name'],
            'category_description': category_data['description'],
            'score_pct': round(score_pct, 1),
            'risk_rating': risk_rating.value,
            'metrics_count': len(metrics_list),
            'metrics_below_target_count': metrics_below_target,
            'weighted_score': round(weighted_score, 3),
        })
    
    # Sort by category code for consistent ordering
    category_scores.sort(key=lambda x: x['category_code'])
    return category_scores


def compute_category_score(db: Session, category_code: str) -> Optional[Dict]:
    """
    Compute score for a specific category.
    
    Args:
        db: Database session
        category_code: Category code (e.g., 'PR.AA', 'ID.AM')
        
    Returns:
        Category score dictionary or None if not found
    """
    # Initialize CSF reference service for category descriptions
    csf_service = CSFReferenceService()
    
    # Get all active metrics for this category
    metrics = (
        db.query(Metric)
        .filter(Metric.csf_category_code == category_code)
        .filter(Metric.active == True)
        .all()
    )
    
    if not metrics:
        return None
    
    # Calculate weighted score
    total_weight = 0.0
    weighted_sum = 0.0
    metrics_below_target = 0
    scoreable_metrics = 0
    metrics_details = []
    
    for metric in metrics:
        weight = float(metric.weight or 1.0)
        score = compute_metric_score(metric)
        gap = compute_gap_to_target(metric)
        
        # Add to metrics details list
        metrics_details.append({
            'id': str(metric.id),
            'name': metric.name,
            'score_pct': score * 100 if score is not None else None,
            'gap_to_target_pct': gap,
            'current_value': float(metric.current_value) if metric.current_value else None,
            'target_value': float(metric.target_value) if metric.target_value else None,
            'priority_rank': metric.priority_rank,
            'owner_function': metric.owner_function,
        })
        
        if score is not None:
            scoreable_metrics += 1
            total_weight += weight
            weighted_sum += score * weight
            
            # Count metrics below target
            if score < 0.9:
                metrics_below_target += 1
    
    if total_weight == 0 or scoreable_metrics == 0:
        weighted_score = 0.0
        score_pct = 0.0
    else:
        weighted_score = weighted_sum / total_weight
        score_pct = weighted_score * 100
    
    risk_rating = get_risk_rating(score_pct)
    
    # Get category information from CSF reference service
    csf_category = csf_service.get_category(category_code)
    category_name = csf_category.name if csf_category else (metrics[0].csf_category_name or category_code)
    category_description = csf_category.description if csf_category else None
    
    return {
        'category_code': category_code,
        'category_name': category_name,
        'category_description': category_description,
        'score_pct': round(score_pct, 1),
        'risk_rating': risk_rating.value,
        'metrics_count': len(metrics),
        'metrics_below_target_count': metrics_below_target,
        'weighted_score': round(weighted_score, 3),
        'metrics': metrics_details,
    }


def get_category_metrics_summary(db: Session, category_code: str) -> Optional[Dict]:
    """
    Get summary of metrics within a category for drill-down analysis.
    
    Args:
        db: Database session  
        category_code: Category code (e.g., 'PR.AA', 'ID.AM')
        
    Returns:
        Category metrics summary or None if not found
    """
    return compute_category_score(db, category_code)


def recalculate_all_scores(db: Session) -> Dict:
    """
    Recalculate all scores and return summary statistics.

    This function can be called after weight changes or target updates
    to refresh all calculated scores.
    """
    function_scores = compute_function_scores(db)
    overall_score_pct, overall_risk_rating = compute_overall_score(function_scores)
    attention_metrics = get_metrics_needing_attention(db, limit=5)

    return {
        "function_scores": [fs.model_dump() for fs in function_scores],
        "overall_score_pct": overall_score_pct,
        "overall_risk_rating": overall_risk_rating.value,
        "metrics_needing_attention": attention_metrics,
        "recalculated_at": "now",  # Could use actual timestamp
    }


# ==============================================================================
# MULTI-FRAMEWORK SCORING FUNCTIONS
# ==============================================================================

def compute_framework_function_scores(
    db: Session,
    framework_code: str
) -> List[Dict[str, Any]]:
    """
    Compute scores for all functions in a specific framework.

    Args:
        db: Database session
        framework_code: Framework code (e.g., 'csf_2_0', 'ai_rmf')

    Returns:
        List of function score dictionaries
    """
    # Get framework
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if not framework:
        return []

    # Get all functions for this framework
    functions = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).order_by(FrameworkFunction.display_order).all()

    function_scores = []

    for func in functions:
        # Get metrics for this function using function_id
        metrics = db.query(Metric).filter(
            Metric.function_id == func.id,
            Metric.active == True
        ).all()

        if not metrics:
            function_scores.append({
                "function_code": func.code,
                "function_name": func.name,
                "function_description": func.description,
                "color_hex": func.color_hex,
                "icon_name": func.icon_name,
                "score_pct": 0.0,
                "risk_rating": RiskRating.VERY_HIGH.value,
                "metrics_count": 0,
                "metrics_with_data_count": 0,
                "metrics_below_target_count": 0,
                "weighted_score": 0.0,
            })
            continue

        # Compute weighted score
        total_weight = 0.0
        weighted_sum = 0.0
        metrics_below_target = 0
        metrics_with_data = 0

        for metric in metrics:
            weight = float(metric.weight or 1.0)
            score = compute_metric_score(metric)

            if score is not None:
                metrics_with_data += 1
                total_weight += weight
                weighted_sum += score * weight

                if score < 0.9:
                    metrics_below_target += 1

        if total_weight == 0 or metrics_with_data == 0:
            weighted_score = 0.0
            score_pct = 0.0
        else:
            weighted_score = weighted_sum / total_weight
            score_pct = weighted_score * 100

        risk_rating = get_risk_rating(score_pct)

        function_scores.append({
            "function_code": func.code,
            "function_name": func.name,
            "function_description": func.description,
            "color_hex": func.color_hex,
            "icon_name": func.icon_name,
            "score_pct": round(score_pct, 1),
            "risk_rating": risk_rating.value,
            "metrics_count": len(metrics),
            "metrics_with_data_count": metrics_with_data,
            "metrics_below_target_count": metrics_below_target,
            "weighted_score": round(weighted_score, 3),
        })

    return function_scores


def compute_framework_category_scores(
    db: Session,
    framework_code: str,
    function_code: str
) -> List[Dict[str, Any]]:
    """
    Compute scores for all categories within a specific function.

    Args:
        db: Database session
        framework_code: Framework code
        function_code: Function code

    Returns:
        List of category score dictionaries
    """
    # Get framework and function
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if not framework:
        return []

    func = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id,
        FrameworkFunction.code == function_code
    ).first()

    if not func:
        return []

    # Get all categories for this function
    categories = db.query(FrameworkCategory).filter(
        FrameworkCategory.function_id == func.id
    ).order_by(FrameworkCategory.display_order).all()

    category_scores = []

    for cat in categories:
        # Get metrics for this category
        if framework_code == "csf_2_0":
            # For CSF 2.0, use the legacy csf_category_code field
            metrics = db.query(Metric).filter(
                Metric.csf_category_code == cat.code,
                Metric.active == True
            ).all()
        else:
            # For other frameworks, use category_id
            metrics = db.query(Metric).filter(
                Metric.category_id == cat.id,
                Metric.active == True
            ).all()

        if not metrics:
            category_scores.append({
                "category_code": cat.code,
                "category_name": cat.name,
                "category_description": cat.description,
                "score_pct": 0.0,
                "risk_rating": RiskRating.VERY_HIGH.value,
                "metrics_count": 0,
                "metrics_with_data_count": 0,
                "metrics_below_target_count": 0,
                "weighted_score": 0.0,
            })
            continue

        # Compute weighted score
        total_weight = 0.0
        weighted_sum = 0.0
        metrics_below_target = 0
        metrics_with_data = 0

        for metric in metrics:
            weight = float(metric.weight or 1.0)
            score = compute_metric_score(metric)

            if score is not None:
                metrics_with_data += 1
                total_weight += weight
                weighted_sum += score * weight

                if score < 0.9:
                    metrics_below_target += 1

        if total_weight == 0 or metrics_with_data == 0:
            weighted_score = 0.0
            score_pct = 0.0
        else:
            weighted_score = weighted_sum / total_weight
            score_pct = weighted_score * 100

        risk_rating = get_risk_rating(score_pct)

        category_scores.append({
            "category_code": cat.code,
            "category_name": cat.name,
            "category_description": cat.description,
            "score_pct": round(score_pct, 1),
            "risk_rating": risk_rating.value,
            "metrics_count": len(metrics),
            "metrics_with_data_count": metrics_with_data,
            "metrics_below_target_count": metrics_below_target,
            "weighted_score": round(weighted_score, 3),
        })

    return category_scores


def compute_framework_overall_score(
    db: Session,
    framework_code: str
) -> Dict[str, Any]:
    """
    Compute overall score for a framework.

    Args:
        db: Database session
        framework_code: Framework code

    Returns:
        Dictionary with overall score and breakdown
    """
    function_scores = compute_framework_function_scores(db, framework_code)

    if not function_scores:
        return {
            "framework_code": framework_code,
            "overall_score_pct": 0.0,
            "overall_risk_rating": RiskRating.VERY_HIGH.value,
            "total_metrics_count": 0,
            "total_metrics_with_data_count": 0,
            "function_scores": [],
        }

    # Filter out functions with no metrics
    valid_scores = [fs for fs in function_scores if fs["metrics_count"] > 0]

    if not valid_scores:
        return {
            "framework_code": framework_code,
            "overall_score_pct": 0.0,
            "overall_risk_rating": RiskRating.VERY_HIGH.value,
            "total_metrics_count": 0,
            "total_metrics_with_data_count": 0,
            "function_scores": function_scores,
        }

    # Calculate overall score as average of function scores
    total_weighted_score = sum(fs["weighted_score"] for fs in valid_scores)
    overall_weighted_score = total_weighted_score / len(valid_scores)
    overall_score_pct = overall_weighted_score * 100
    overall_risk_rating = get_risk_rating(overall_score_pct)

    total_metrics = sum(fs["metrics_count"] for fs in function_scores)
    total_with_data = sum(fs["metrics_with_data_count"] for fs in function_scores)

    return {
        "framework_code": framework_code,
        "overall_score_pct": round(overall_score_pct, 1),
        "overall_risk_rating": overall_risk_rating.value,
        "total_metrics": total_metrics,
        "metrics_with_data": total_with_data,
        "function_scores": function_scores,
    }


def get_framework_metrics_needing_attention(
    db: Session,
    framework_code: str,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Get metrics that need attention for a specific framework.

    Args:
        db: Database session
        framework_code: Framework code
        limit: Maximum number of metrics to return

    Returns:
        List of metric dictionaries with scores and gaps
    """
    # Get framework
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if not framework:
        return []

    # Get metrics for this framework
    metrics = db.query(Metric).filter(
        Metric.framework_id == framework.id,
        Metric.active == True,
        Metric.current_value != None
    ).all()

    scored_metrics = []
    for metric in metrics:
        score = compute_metric_score(metric)
        gap = compute_gap_to_target(metric)

        if score is not None:
            func_code = metric.function.code if metric.function else "unknown"

            scored_metrics.append({
                "id": str(metric.id),
                "metric_number": metric.metric_number,
                "name": metric.name,
                "function_code": func_code,
                "category_code": metric.category.code if metric.category else None,
                "priority_rank": metric.priority_rank,
                "score": score,
                "score_pct": score * 100,
                "gap_to_target_pct": gap,
                "current_value": float(metric.current_value),
                "target_value": float(metric.target_value) if metric.target_value else None,
                "current_label": metric.current_label,
                "owner_function": metric.owner_function,
            })

    # Sort by priority (1=high) and score (low scores first)
    scored_metrics.sort(key=lambda x: (x["priority_rank"], x["score"]))

    return scored_metrics[:limit]


def get_framework_coverage(
    db: Session,
    framework_code: str
) -> Dict[str, Any]:
    """
    Get coverage statistics for a framework showing which functions/categories have metrics.

    Args:
        db: Database session
        framework_code: Framework code

    Returns:
        Coverage statistics dictionary
    """
    # Get framework
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if not framework:
        return {}

    # Get all functions
    functions = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).all()

    # Get all categories
    categories = db.query(FrameworkCategory).filter(
        FrameworkCategory.function_id.in_([f.id for f in functions])
    ).all()

    # Count metrics per function/category
    function_coverage = []
    total_functions = len(functions)
    functions_with_metrics = 0

    for func in functions:
        metric_count = db.query(Metric).filter(
            Metric.function_id == func.id,
            Metric.active == True
        ).count()

        if metric_count > 0:
            functions_with_metrics += 1

        function_coverage.append({
            "function_code": func.code,
            "function_name": func.name,
            "metrics_count": metric_count,
            "has_metrics": metric_count > 0,
        })

    total_categories = len(categories)
    categories_with_metrics = 0

    for cat in categories:
        metric_count = db.query(Metric).filter(
            Metric.category_id == cat.id,
            Metric.active == True
        ).count()

        if metric_count > 0:
            categories_with_metrics += 1

    return {
        "framework_code": framework_code,
        "total_functions": total_functions,
        "functions_with_metrics": functions_with_metrics,
        "function_coverage_pct": round(
            (functions_with_metrics / total_functions * 100) if total_functions > 0 else 0, 1
        ),
        "total_categories": total_categories,
        "categories_with_metrics": categories_with_metrics,
        "category_coverage_pct": round(
            (categories_with_metrics / total_categories * 100) if total_categories > 0 else 0, 1
        ),
        "function_breakdown": function_coverage,
    }


# Convenience exports for backward compatibility
calculate_metric_score = compute_metric_score
calculate_function_scores = compute_function_scores