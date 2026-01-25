"""Demo metrics configuration and validation.

Defines which categories are included in demo mode and provides
utilities to verify demo metrics coverage.
"""

from typing import Dict, List, Tuple
from sqlalchemy.orm import Session

from ..models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    Metric,
)


# Demo metrics: 1 per category for each framework
# Categories selected to provide representative coverage of the framework

DEMO_CSF_2_0_CATEGORIES: List[str] = [
    # GOVERN (6 categories + 3 AI Profile categories)
    "GV.OC",  # Organizational Context
    "GV.OV",  # Oversight
    "GV.PO",  # Policy
    "GV.RM",  # Risk Management Strategy
    "GV.RR",  # Roles, Responsibilities, and Authorities
    "GV.SC",  # Cybersecurity Supply Chain Risk Management

    # IDENTIFY (3 categories + 3 AI Profile categories)
    "ID.AM",  # Asset Management
    "ID.IM",  # Improvement
    "ID.RA",  # Risk Assessment

    # PROTECT (8 categories + 3 AI Profile categories)
    "PR.AA",  # Identity Management, Authentication, and Access Control
    "PR.AT",  # Awareness and Training
    "PR.DS",  # Data Security
    "PR.IP",  # Information Protection Processes and Procedures
    "PR.IR",  # Infrastructure Resilience
    "PR.MA",  # Maintenance
    "PR.PS",  # Protective Technology
    "PR.PT",  # Platform Security

    # DETECT (2 categories + 3 AI Profile categories)
    "DE.AE",  # Adverse Event Analysis
    "DE.CM",  # Continuous Monitoring

    # RESPOND (5 categories + 3 AI Profile categories)
    "RS.AN",  # Analysis
    "RS.CO",  # Communications
    "RS.MA",  # Mitigation
    "RS.MI",  # Incident Mitigation
    "RS.RP",  # Response Planning

    # RECOVER (3 categories + 2 AI Profile categories)
    "RC.CO",  # Communications
    "RC.IM",  # Improvements
    "RC.RP",  # Recovery Planning
]

DEMO_AI_RMF_CATEGORIES: List[str] = [
    # GOVERN (6 subcategories)
    "GOVERN-1",  # Policies, processes, procedures, and practices
    "GOVERN-2",  # Accountability structures
    "GOVERN-3",  # Workforce diversity
    "GOVERN-4",  # Organizational culture
    "GOVERN-5",  # Stakeholder engagement
    "GOVERN-6",  # Third-party risks

    # MAP (5 subcategories)
    "MAP-1",  # Context establishment
    "MAP-2",  # AI categorization
    "MAP-3",  # AI benefits
    "MAP-4",  # Risk identification
    "MAP-5",  # Impact assessment

    # MEASURE (4 subcategories)
    "MEASURE-1",  # Risk measurement
    "MEASURE-2",  # AI system testing
    "MEASURE-3",  # Risk tracking
    "MEASURE-4",  # Measurement communication

    # MANAGE (4 subcategories)
    "MANAGE-1",  # Risk prioritization
    "MANAGE-2",  # Risk treatment
    "MANAGE-3",  # Pre-deployment review
    "MANAGE-4",  # Incident management
]


def get_demo_categories(framework_code: str) -> List[str]:
    """Get demo category codes for a framework."""
    if framework_code == "csf_2_0":
        return DEMO_CSF_2_0_CATEGORIES
    elif framework_code == "ai_rmf":
        return DEMO_AI_RMF_CATEGORIES
    return []


def validate_demo_coverage(db: Session) -> Dict[str, List[str]]:
    """Validate that demo categories have at least one metric each.

    Returns a dict with lists of categories missing metrics.
    """
    results = {
        "csf_2_0_missing": [],
        "ai_rmf_missing": [],
        "csf_2_0_covered": [],
        "ai_rmf_covered": [],
    }

    # Check CSF 2.0
    csf_framework = db.query(Framework).filter(Framework.code == "csf_2_0").first()
    if csf_framework:
        for cat_code in DEMO_CSF_2_0_CATEGORIES:
            category = db.query(FrameworkCategory).filter(
                FrameworkCategory.code == cat_code
            ).first()

            if category:
                metric = db.query(Metric).filter(
                    Metric.category_id == category.id,
                    Metric.active == True,
                ).first()

                if metric:
                    results["csf_2_0_covered"].append(cat_code)
                else:
                    results["csf_2_0_missing"].append(cat_code)
            else:
                results["csf_2_0_missing"].append(f"{cat_code} (category not found)")

    # Check AI RMF
    ai_rmf_framework = db.query(Framework).filter(Framework.code == "ai_rmf").first()
    if ai_rmf_framework:
        for cat_code in DEMO_AI_RMF_CATEGORIES:
            category = db.query(FrameworkCategory).filter(
                FrameworkCategory.code == cat_code
            ).first()

            if category:
                metric = db.query(Metric).filter(
                    Metric.category_id == category.id,
                    Metric.active == True,
                ).first()

                if metric:
                    results["ai_rmf_covered"].append(cat_code)
                else:
                    results["ai_rmf_missing"].append(cat_code)
            else:
                results["ai_rmf_missing"].append(f"{cat_code} (category not found)")

    return results


def get_demo_metrics_summary(db: Session) -> Dict[str, any]:
    """Get summary of demo metrics for each framework."""
    summary = {
        "csf_2_0": {
            "total_categories": len(DEMO_CSF_2_0_CATEGORIES),
            "metrics_available": 0,
            "categories_with_metrics": [],
        },
        "ai_rmf": {
            "total_categories": len(DEMO_AI_RMF_CATEGORIES),
            "metrics_available": 0,
            "categories_with_metrics": [],
        },
    }

    validation = validate_demo_coverage(db)

    summary["csf_2_0"]["metrics_available"] = len(validation["csf_2_0_covered"])
    summary["csf_2_0"]["categories_with_metrics"] = validation["csf_2_0_covered"]
    summary["csf_2_0"]["categories_missing"] = validation["csf_2_0_missing"]

    summary["ai_rmf"]["metrics_available"] = len(validation["ai_rmf_covered"])
    summary["ai_rmf"]["categories_with_metrics"] = validation["ai_rmf_covered"]
    summary["ai_rmf"]["categories_missing"] = validation["ai_rmf_missing"]

    return summary


if __name__ == "__main__":
    from ..db import SessionLocal

    db = SessionLocal()
    try:
        print("Demo Metrics Coverage Validation")
        print("=" * 50)

        summary = get_demo_metrics_summary(db)

        print(f"\nCSF 2.0:")
        print(f"  Total demo categories: {summary['csf_2_0']['total_categories']}")
        print(f"  Categories with metrics: {summary['csf_2_0']['metrics_available']}")
        if summary['csf_2_0'].get('categories_missing'):
            print(f"  Missing metrics for: {summary['csf_2_0']['categories_missing']}")

        print(f"\nAI RMF:")
        print(f"  Total demo categories: {summary['ai_rmf']['total_categories']}")
        print(f"  Categories with metrics: {summary['ai_rmf']['metrics_available']}")
        if summary['ai_rmf'].get('categories_missing'):
            print(f"  Missing metrics for: {summary['ai_rmf']['categories_missing']}")

    finally:
        db.close()
