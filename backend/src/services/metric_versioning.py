"""Metric versioning service for creating snapshots and computing diffs.

Provides automatic version snapshots when metrics are updated,
and utilities for comparing versions over time.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..models import Metric, MetricHistory


# Fields captured in every version snapshot
SNAPSHOT_FIELDS = [
    "name",
    "description",
    "formula",
    "priority_rank",
    "weight",
    "direction",
    "target_value",
    "target_units",
    "tolerance_low",
    "tolerance_high",
    "current_value",
    "current_label",
    "owner_function",
    "data_source",
    "collection_frequency",
    "notes",
    "risk_definition",
    "active",
    "metric_number",
]


def _serialize_value(value: Any) -> Any:
    """Serialize a metric field value for JSON storage."""
    if value is None:
        return None
    if hasattr(value, "value"):
        # Enum types (MetricDirection, CollectionFrequency)
        return value.value
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "__float__"):
        # Decimal / Numeric types
        return float(value)
    return value


def _build_snapshot(metric: Metric) -> Dict[str, Any]:
    """Build a JSON-serializable snapshot dict from a Metric instance."""
    snapshot: Dict[str, Any] = {}
    for field in SNAPSHOT_FIELDS:
        raw = getattr(metric, field, None)
        snapshot[field] = _serialize_value(raw)
    return snapshot


def create_version_snapshot(
    db: Session,
    metric: Metric,
    changed_fields: List[str],
    changed_by: str = "system",
    source: str = "api",
    change_notes: Optional[str] = None,
) -> Any:
    """Create a snapshot of the metric's current state before updating.

    Args:
        db: SQLAlchemy session.
        metric: The Metric ORM object (pre-update state).
        changed_fields: List of field names that are about to change.
        changed_by: Username or identifier of who triggered the change.
        source: Origin of the change ('api', 'ai', 'import', 'system').
        change_notes: Optional human-readable notes about the change.

    Returns:
        The newly created MetricVersion record.
    """
    from ..models import MetricVersion  # deferred import to avoid circular refs

    # Determine the next version number for this metric
    latest = (
        db.query(func.max(MetricVersion.version_number))
        .filter(MetricVersion.metric_id == metric.id)
        .scalar()
    )
    next_version = (latest or 0) + 1

    # Serialize the current metric state
    snapshot = _build_snapshot(metric)

    version = MetricVersion(
        metric_id=metric.id,
        version_number=next_version,
        snapshot_json=snapshot,
        changed_fields=changed_fields,
        changed_by=changed_by,
        change_source=source,
        change_notes=change_notes,
    )
    db.add(version)
    # Flush so the version gets an id, but don't commit yet
    # (the caller's transaction will commit)
    db.flush()
    return version


def get_version_diff(snapshot_a: Dict[str, Any], snapshot_b: Dict[str, Any]) -> Dict[str, Any]:
    """Compute a field-level diff between two version snapshots.

    Args:
        snapshot_a: The older snapshot dict.
        snapshot_b: The newer snapshot dict.

    Returns:
        A dict keyed by field name, each value is {"from": old_val, "to": new_val}.
        Only fields that differ are included.
    """
    all_keys = set(list(snapshot_a.keys()) + list(snapshot_b.keys()))
    diff: Dict[str, Any] = {}

    for key in sorted(all_keys):
        val_a = snapshot_a.get(key)
        val_b = snapshot_b.get(key)

        # Normalize for comparison (handle float vs int edge cases)
        if isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
            if float(val_a) != float(val_b):
                diff[key] = {"from": val_a, "to": val_b}
        elif val_a != val_b:
            diff[key] = {"from": val_a, "to": val_b}

    return diff
