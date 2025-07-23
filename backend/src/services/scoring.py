"""Scoring service for NIST CSF 2.0 metrics with gap-to-target calculations."""

import os
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from ..models import Metric, CSFFunction, MetricDirection
from ..schemas import FunctionScore, RiskRating
from .csf_reference import CSFReferenceService


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
        if target == 0:
            score = 1.0 if current == 0 else 0.0
        else:
            score = max(0.0, min(1.0, 1.0 - (current / target)))
            
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
    # Get thresholds from environment or use new 5-level defaults
    threshold_very_low = float(os.getenv("RISK_THRESHOLD_VERY_LOW", "90.0"))
    threshold_low = float(os.getenv("RISK_THRESHOLD_LOW", "75.0"))
    threshold_medium = float(os.getenv("RISK_THRESHOLD_MEDIUM", "50.0"))
    threshold_high = float(os.getenv("RISK_THRESHOLD_HIGH", "30.0"))
    
    if score_pct >= threshold_very_low:
        return RiskRating.VERY_LOW
    elif score_pct >= threshold_low:
        return RiskRating.LOW
    elif score_pct >= threshold_medium:
        return RiskRating.MEDIUM
    elif score_pct >= threshold_high:
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
            .filter(Metric.csf_function == csf_function)
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
            scored_metrics.append({
                "id": str(metric.id),
                "metric_number": metric.metric_number,
                "name": metric.name,
                "csf_function": metric.csf_function.value,
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
        .filter(Metric.csf_function == csf_function)
        .filter(Metric.active == True)
        .filter(Metric.csf_category_code != None)
        .all()
    )
    
    if not metrics:
        return []
    
    # Group metrics by category
    category_groups = {}
    for metric in metrics:
        category_code = metric.csf_category_code
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