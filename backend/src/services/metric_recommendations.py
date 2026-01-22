"""Metric recommendations service using Claude AI.

Analyzes framework coverage and suggests new metrics to improve
security posture visibility and close coverage gaps.
"""

from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from ..models import (
    Metric,
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    CSFFunction,
)
from .claude_client import claude_client
from .scoring import (
    get_framework_coverage,
    compute_framework_overall_score,
)


async def generate_metric_recommendations(
    db: Session,
    framework_code: str,
    max_recommendations: int = 10
) -> Dict[str, Any]:
    """
    Generate AI-powered metric recommendations based on framework coverage analysis.

    Args:
        db: Database session
        framework_code: Framework code (e.g., 'csf_2_0', 'ai_rmf')
        max_recommendations: Maximum number of recommendations to return

    Returns:
        Dictionary with recommendations and gap analysis
    """
    # Get current coverage and scores
    coverage = get_framework_coverage(db, framework_code)
    scores = compute_framework_overall_score(db, framework_code)

    if not coverage:
        return {
            "success": False,
            "error": f"Framework '{framework_code}' not found or has no data",
            "recommendations": [],
            "gap_analysis": {}
        }

    # Get existing metrics summary for context
    existing_metrics = _get_existing_metrics_summary(db, framework_code)

    # Use Claude to generate recommendations
    try:
        result = await claude_client.generate_metric_recommendations(
            framework=framework_code,
            current_metrics=existing_metrics,
            current_scores={
                "overall_score_pct": scores.get("overall_score_pct", 0),
                "function_scores": scores.get("function_scores", []),
                "coverage": coverage
            }
        )

        # Limit recommendations
        recommendations = result.get("recommendations", [])[:max_recommendations]

        return {
            "success": True,
            "framework_code": framework_code,
            "recommendations": recommendations,
            "gap_analysis": result.get("gap_analysis", {}),
            "current_coverage": coverage,
            "current_overall_score": scores.get("overall_score_pct", 0),
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "recommendations": [],
            "gap_analysis": {},
            "current_coverage": coverage,
        }


def _get_existing_metrics_summary(
    db: Session,
    framework_code: str
) -> List[Dict[str, Any]]:
    """Get summary of existing metrics for a framework."""

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
        Metric.active == True
    ).all()

    summary = []
    for metric in metrics:
        func_code = metric.function.code if metric.function else "unknown"
        cat_code = metric.category.code if metric.category else None

        summary.append({
            "name": metric.name,
            "function_code": func_code,
            "category_code": cat_code,
            "priority_rank": metric.priority_rank,
            "has_data": metric.current_value is not None,
        })

    return summary


def get_coverage_gaps(
    db: Session,
    framework_code: str
) -> Dict[str, Any]:
    """
    Identify coverage gaps in a framework.

    Returns functions and categories that have no metrics or insufficient coverage.
    """
    # Get framework
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if not framework:
        return {"error": f"Framework '{framework_code}' not found"}

    # Get all functions
    functions = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).order_by(FrameworkFunction.display_order).all()

    gaps = {
        "framework_code": framework_code,
        "functions_without_metrics": [],
        "functions_with_low_coverage": [],
        "categories_without_metrics": [],
        "total_gap_count": 0
    }

    for func in functions:
        # Count metrics for this function
        metric_count = db.query(Metric).filter(
            Metric.function_id == func.id,
            Metric.active == True
        ).count()

        if metric_count == 0:
            gaps["functions_without_metrics"].append({
                "function_code": func.code,
                "function_name": func.name,
                "description": func.description,
            })
            gaps["total_gap_count"] += 1
        elif metric_count < 3:  # Less than 3 metrics is considered low coverage
            gaps["functions_with_low_coverage"].append({
                "function_code": func.code,
                "function_name": func.name,
                "metric_count": metric_count,
            })

        # Check categories within this function
        categories = db.query(FrameworkCategory).filter(
            FrameworkCategory.function_id == func.id
        ).all()

        for cat in categories:
            cat_metric_count = db.query(Metric).filter(
                Metric.category_id == cat.id,
                Metric.active == True
            ).count()

            if cat_metric_count == 0:
                gaps["categories_without_metrics"].append({
                    "category_code": cat.code,
                    "category_name": cat.name,
                    "function_code": func.code,
                    "function_name": func.name,
                })
                gaps["total_gap_count"] += 1

    return gaps


async def suggest_metrics_for_gap(
    db: Session,
    framework_code: str,
    function_code: Optional[str] = None,
    category_code: Optional[str] = None,
    count: int = 5
) -> Dict[str, Any]:
    """
    Suggest specific metrics to fill a particular coverage gap.

    Args:
        db: Database session
        framework_code: Framework code
        function_code: Optional - focus on specific function
        category_code: Optional - focus on specific category
        count: Number of suggestions to generate

    Returns:
        Dictionary with metric suggestions
    """
    # Build context for Claude
    context = {
        "framework_code": framework_code,
        "target_function": function_code,
        "target_category": category_code,
        "existing_metrics": _get_existing_metrics_summary(db, framework_code),
    }

    # Get function/category details if specified
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if framework:
        if function_code:
            func = db.query(FrameworkFunction).filter(
                FrameworkFunction.framework_id == framework.id,
                FrameworkFunction.code == function_code
            ).first()
            if func:
                context["target_function_name"] = func.name
                context["target_function_description"] = func.description

        if category_code:
            cat = db.query(FrameworkCategory).filter(
                FrameworkCategory.code == category_code
            ).first()
            if cat:
                context["target_category_name"] = cat.name
                context["target_category_description"] = cat.description

    # Build prompt for Claude
    focus_msg = ""
    if function_code and category_code:
        focus_msg = f"Focus specifically on the {context.get('target_function_name', function_code)} function, {context.get('target_category_name', category_code)} category."
    elif function_code:
        focus_msg = f"Focus specifically on the {context.get('target_function_name', function_code)} function."
    elif category_code:
        focus_msg = f"Focus specifically on the {context.get('target_category_name', category_code)} category."

    message = f"""Suggest {count} new cybersecurity metrics for the {framework_code} framework. {focus_msg}

Current coverage context:
- Total existing metrics: {len(context['existing_metrics'])}
- Target function: {function_code or 'Any'}
- Target category: {category_code or 'Any'}

For each metric suggestion, provide:
1. A clear name
2. Description of what it measures
3. Suggested target value and units
4. Why this metric would be valuable
5. Recommended data source"""

    try:
        result = await claude_client.generate_response(
            message=message,
            mode="recommendations",
            framework=framework_code,
            context=context
        )

        return {
            "success": True,
            "framework_code": framework_code,
            "target_function": function_code,
            "target_category": category_code,
            "suggestions": result.get("recommendations", [])[:count],
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "suggestions": [],
        }


def get_metric_distribution(
    db: Session,
    framework_code: str
) -> Dict[str, Any]:
    """
    Get the distribution of metrics across framework functions and categories.

    Useful for identifying imbalances in metric coverage.
    """
    framework = db.query(Framework).filter(
        Framework.code == framework_code,
        Framework.active == True
    ).first()

    if not framework:
        return {"error": f"Framework '{framework_code}' not found"}

    functions = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).order_by(FrameworkFunction.display_order).all()

    distribution = {
        "framework_code": framework_code,
        "total_metrics": 0,
        "functions": [],
        "metrics_by_priority": {1: 0, 2: 0, 3: 0},
        "metrics_with_data": 0,
        "metrics_without_data": 0,
    }

    for func in functions:
        # Get metrics for this function
        if framework_code == "csf_2_0":
            try:
                csf_func = CSFFunction(func.code)
                metrics = db.query(Metric).filter(
                    Metric.csf_function == csf_func,
                    Metric.active == True
                ).all()
            except ValueError:
                metrics = db.query(Metric).filter(
                    Metric.function_id == func.id,
                    Metric.active == True
                ).all()
        else:
            metrics = db.query(Metric).filter(
                Metric.function_id == func.id,
                Metric.active == True
            ).all()

        func_data = {
            "function_code": func.code,
            "function_name": func.name,
            "metric_count": len(metrics),
            "categories": []
        }

        # Count by priority
        for metric in metrics:
            priority = metric.priority_rank or 2
            if priority in distribution["metrics_by_priority"]:
                distribution["metrics_by_priority"][priority] += 1

            if metric.current_value is not None:
                distribution["metrics_with_data"] += 1
            else:
                distribution["metrics_without_data"] += 1

        distribution["total_metrics"] += len(metrics)

        # Get category breakdown
        categories = db.query(FrameworkCategory).filter(
            FrameworkCategory.function_id == func.id
        ).all()

        for cat in categories:
            cat_metric_count = db.query(Metric).filter(
                Metric.category_id == cat.id,
                Metric.active == True
            ).count()

            func_data["categories"].append({
                "category_code": cat.code,
                "category_name": cat.name,
                "metric_count": cat_metric_count,
            })

        distribution["functions"].append(func_data)

    return distribution
