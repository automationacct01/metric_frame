"""Metrics seed data loader script.

Loads sample metrics for NIST CSF 2.0 and AI RMF frameworks.
"""

import json
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    FrameworkSubcategory,
    Metric,
    MetricDirection,
    CollectionFrequency,
)


DATA_DIR = Path(__file__).parent.parent / "data"


def get_framework_by_code(db: Session, code: str) -> Optional[Framework]:
    """Get a framework by its code."""
    return db.query(Framework).filter(Framework.code == code).first()


def get_function_by_code(db: Session, framework_id: uuid.UUID, code: str) -> Optional[FrameworkFunction]:
    """Get a function by its code within a framework."""
    return db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework_id,
        FrameworkFunction.code == code.lower()
    ).first()


def get_category_by_code(db: Session, code: str) -> Optional[FrameworkCategory]:
    """Get a category by its code."""
    return db.query(FrameworkCategory).filter(FrameworkCategory.code == code).first()


def get_subcategory_by_code(db: Session, code: str) -> Optional[FrameworkSubcategory]:
    """Get a subcategory by its code."""
    return db.query(FrameworkSubcategory).filter(FrameworkSubcategory.code == code).first()


def parse_direction(direction_str: str) -> MetricDirection:
    """Parse direction string to enum."""
    direction_map = {
        "higher_is_better": MetricDirection.HIGHER_IS_BETTER,
        "lower_is_better": MetricDirection.LOWER_IS_BETTER,
        "target_range": MetricDirection.TARGET_RANGE,
        "binary": MetricDirection.BINARY,
    }
    return direction_map.get(direction_str, MetricDirection.HIGHER_IS_BETTER)


def parse_collection_frequency(freq_str: str) -> Optional[CollectionFrequency]:
    """Parse collection frequency string to enum."""
    if not freq_str:
        return None
    freq_map = {
        "daily": CollectionFrequency.DAILY,
        "weekly": CollectionFrequency.WEEKLY,
        "monthly": CollectionFrequency.MONTHLY,
        "quarterly": CollectionFrequency.QUARTERLY,
        "ad_hoc": CollectionFrequency.AD_HOC,
    }
    return freq_map.get(freq_str.lower())


def load_metrics_from_json(db: Session, json_path: Path) -> List[Metric]:
    """Load metrics from a JSON file.

    Args:
        db: Database session
        json_path: Path to the JSON file containing metrics

    Returns:
        List of created Metric objects
    """
    with open(json_path, "r") as f:
        data = json.load(f)

    framework_code = data["framework_code"]
    framework = get_framework_by_code(db, framework_code)

    if not framework:
        print(f"Framework '{framework_code}' not found. Please load frameworks first.")
        return []

    metrics_created = []

    for metric_data in data["metrics"]:
        # Check if metric already exists
        existing = db.query(Metric).filter(
            Metric.framework_id == framework.id,
            Metric.metric_number == metric_data["metric_number"]
        ).first()

        if existing:
            print(f"Metric {metric_data['metric_number']} already exists, skipping...")
            continue

        # Get function
        function = get_function_by_code(db, framework.id, metric_data["function_code"])
        if not function:
            print(f"Function '{metric_data['function_code']}' not found for metric {metric_data['metric_number']}")
            continue

        # Get category (optional)
        category = None
        if metric_data.get("category_code"):
            category = get_category_by_code(db, metric_data["category_code"])

        # Get subcategory (optional)
        subcategory = None
        if metric_data.get("subcategory_code"):
            subcategory = get_subcategory_by_code(db, metric_data["subcategory_code"])

        # Create the metric
        metric = Metric(
            id=uuid.uuid4(),
            metric_number=metric_data["metric_number"],
            name=metric_data["name"],
            description=metric_data.get("description"),
            formula=metric_data.get("formula"),
            framework_id=framework.id,
            function_id=function.id,
            category_id=category.id if category else None,
            subcategory_id=subcategory.id if subcategory else None,
            direction=parse_direction(metric_data["direction"]),
            target_value=metric_data.get("target_value"),
            target_units=metric_data.get("target_units"),
            current_value=metric_data.get("current_value"),
            priority_rank=metric_data.get("priority_rank", 2),
            owner_function=metric_data.get("owner_function"),
            data_source=metric_data.get("data_source"),
            collection_frequency=parse_collection_frequency(metric_data.get("collection_frequency")),
            trustworthiness_characteristic=metric_data.get("trustworthiness_characteristic"),
            ai_profile_focus=metric_data.get("ai_profile_focus"),
            notes=metric_data.get("notes"),
            risk_definition=metric_data.get("risk_definition"),
            active=True,
        )

        db.add(metric)
        metrics_created.append(metric)
        print(f"Created metric: {metric.metric_number} - {metric.name}")

    return metrics_created


def load_csf_metrics(db: Session) -> List[Metric]:
    """Load CSF 2.0 sample metrics."""
    json_path = DATA_DIR / "csf_2_0_sample_metrics.json"
    return load_metrics_from_json(db, json_path)


def load_ai_rmf_metrics(db: Session) -> List[Metric]:
    """Load AI RMF sample metrics."""
    json_path = DATA_DIR / "ai_rmf_sample_metrics.json"
    return load_metrics_from_json(db, json_path)


def load_all_metrics(db: Optional[Session] = None) -> Dict[str, List[Metric]]:
    """Load all sample metrics into the database.

    Args:
        db: Optional database session. If not provided, creates a new one.

    Returns:
        Dictionary mapping framework codes to lists of created metrics.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        metrics = {}

        print("\nLoading CSF 2.0 metrics...")
        csf_metrics = load_csf_metrics(db)
        metrics["csf_2_0"] = csf_metrics
        print(f"Created {len(csf_metrics)} CSF 2.0 metrics")

        print("\nLoading AI RMF metrics...")
        ai_rmf_metrics = load_ai_rmf_metrics(db)
        metrics["ai_rmf"] = ai_rmf_metrics
        print(f"Created {len(ai_rmf_metrics)} AI RMF metrics")

        db.commit()
        print("\nMetrics loaded successfully!")
        return metrics

    except Exception as e:
        db.rollback()
        print(f"Error loading metrics: {e}")
        raise
    finally:
        if should_close:
            db.close()


def clear_all_metrics(db: Optional[Session] = None) -> None:
    """Clear all metrics from the database.

    Args:
        db: Optional database session. If not provided, creates a new one.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        deleted_count = db.query(Metric).delete()
        db.commit()
        print(f"Cleared {deleted_count} metrics")
    except Exception as e:
        db.rollback()
        print(f"Error clearing metrics: {e}")
        raise
    finally:
        if should_close:
            db.close()


def get_metrics_summary(db: Optional[Session] = None) -> Dict[str, Any]:
    """Get a summary of metrics in the database.

    Args:
        db: Optional database session. If not provided, creates a new one.

    Returns:
        Dictionary with metrics summary by framework.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        summary = {}
        frameworks = db.query(Framework).all()

        for framework in frameworks:
            metrics_count = db.query(Metric).filter(
                Metric.framework_id == framework.id
            ).count()

            by_function = {}
            functions = db.query(FrameworkFunction).filter(
                FrameworkFunction.framework_id == framework.id
            ).all()

            for func in functions:
                func_count = db.query(Metric).filter(
                    Metric.function_id == func.id
                ).count()
                by_function[func.code] = func_count

            summary[framework.code] = {
                "total": metrics_count,
                "by_function": by_function,
            }

        return summary
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Load metrics data into the database")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all existing metrics before loading",
    )
    parser.add_argument(
        "--clear-only",
        action="store_true",
        help="Only clear metrics, do not load new data",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print summary of metrics in database",
    )
    args = parser.parse_args()

    if args.summary:
        summary = get_metrics_summary()
        print("\nMetrics Summary:")
        for framework, data in summary.items():
            print(f"\n{framework}:")
            print(f"  Total: {data['total']}")
            print("  By Function:")
            for func, count in data['by_function'].items():
                print(f"    {func}: {count}")
    elif args.clear_only:
        clear_all_metrics()
    else:
        if args.clear:
            clear_all_metrics()
        load_all_metrics()
