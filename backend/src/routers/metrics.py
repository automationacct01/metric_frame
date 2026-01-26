"""CRUD API endpoints for metrics management.

Supports multi-framework metrics with backward compatibility for CSF 2.0.
"""

from typing import List, Optional
from uuid import UUID
import csv
import io
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from ..db import get_db
from ..models import Metric, MetricHistory, Framework, FrameworkFunction, FrameworkCategory
from ..schemas import (
    MetricResponse,
    MetricCreate,
    MetricUpdate,
    MetricFilters,
    MetricListResponse,
    MetricHistoryCreate,
    MetricHistoryResponse,
    CSFFunction,
)
from ..services.scoring import compute_metric_score, compute_gap_to_target


def _add_scores_to_response(metric: Metric) -> MetricResponse:
    """Create MetricResponse with computed scores."""
    response = MetricResponse.model_validate(metric)
    score = compute_metric_score(metric)
    response.metric_score = score * 100 if score is not None else None  # Convert to percentage
    response.gap_to_target = compute_gap_to_target(metric)
    return response

router = APIRouter()


@router.get("/", response_model=MetricListResponse)
async def list_metrics(
    framework: Optional[str] = Query(None, description="Framework code (csf_2_0, ai_rmf)"),
    function: Optional[CSFFunction] = None,
    function_code: Optional[str] = Query(None, description="Generic function code for any framework"),
    priority_rank: Optional[int] = Query(None, ge=1, le=3),
    active: Optional[bool] = None,
    search: Optional[str] = None,
    owner_function: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List metrics with filtering and pagination.

    Supports multi-framework filtering:
    - framework: Filter by framework code (csf_2_0, ai_rmf)
    - function: CSF 2.0 specific function filter (gv, id, pr, de, rs, rc)
    - function_code: Generic function code for any framework
    """

    query = db.query(Metric)

    # Apply filters
    filters = []

    # Framework filtering
    if framework:
        fw = db.query(Framework).filter(
            Framework.code == framework,
            Framework.active == True
        ).first()
        if fw:
            filters.append(Metric.framework_id == fw.id)
        else:
            # No matching framework, return empty
            return MetricListResponse(
                items=[], total=0, limit=limit, offset=offset, has_more=False
            )

    # Function filtering - use function_id
    if function:
        # Find the function by code
        fw_func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == function.value
        ).first()
        if fw_func:
            filters.append(Metric.function_id == fw_func.id)

    # Generic function code filtering (multi-framework)
    if function_code:
        fw_func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == function_code.lower()
        ).first()
        if fw_func:
            filters.append(Metric.function_id == fw_func.id)

    if priority_rank:
        filters.append(Metric.priority_rank == priority_rank)
    if active is not None:
        filters.append(Metric.active == active)
    if owner_function:
        filters.append(Metric.owner_function.ilike(f"%{owner_function}%"))
    if search:
        search_filter = or_(
            Metric.name.ilike(f"%{search}%"),
            Metric.description.ilike(f"%{search}%"),
            Metric.notes.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        query = query.filter(and_(*filters))

    # Get total count
    total = query.count()

    # Apply pagination and ordering
    items = (
        query
        .order_by(Metric.priority_rank, Metric.metric_number)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return MetricListResponse(
        items=[_add_scores_to_response(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + len(items)) < total,
    )


@router.post("/", response_model=MetricResponse)
async def create_metric(
    metric: MetricCreate,
    db: Session = Depends(get_db),
):
    """Create a new metric."""
    from ..models import Framework, FrameworkFunction

    # Check for duplicate name
    existing = db.query(Metric).filter(Metric.name == metric.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Metric with name '{metric.name}' already exists")

    # Validate target_value for non-binary metrics
    if metric.direction != "binary" and metric.target_value is None:
        raise HTTPException(
            status_code=400,
            detail="target_value is required for non-binary metrics"
        )

    # Set default weight based on priority if not provided
    if not metric.weight and metric.priority_rank:
        weight_map = {1: 1.0, 2: 0.6, 3: 0.3}
        metric.weight = weight_map.get(metric.priority_rank, 1.0)

    # Convert model to dict and handle csf_function -> function_id conversion
    metric_data = metric.model_dump()

    # If csf_function is provided but function_id is not, look up the function_id
    csf_function = metric_data.pop('csf_function', None)
    if csf_function and not metric_data.get('function_id'):
        # Get the function code (handle both enum and string)
        func_code = csf_function.value if hasattr(csf_function, 'value') else csf_function

        # Find the framework function
        framework_func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == func_code
        ).first()

        if framework_func:
            metric_data['function_id'] = framework_func.id
            metric_data['framework_id'] = framework_func.framework_id

    # Remove other legacy CSF fields that are computed properties
    for field in ['csf_category_code', 'csf_subcategory_code', 'csf_category_name', 'csf_subcategory_outcome']:
        metric_data.pop(field, None)

    # Convert direction enum to the model's enum type
    from ..models import MetricDirection as ModelMetricDirection, CollectionFrequency as ModelCollectionFrequency
    if metric_data.get('direction'):
        direction_val = metric_data['direction']
        if hasattr(direction_val, 'value'):
            direction_val = direction_val.value
        metric_data['direction'] = ModelMetricDirection(direction_val)

    # Convert collection_frequency enum to the model's enum type
    if metric_data.get('collection_frequency'):
        freq_val = metric_data['collection_frequency']
        if hasattr(freq_val, 'value'):
            freq_val = freq_val.value
        metric_data['collection_frequency'] = ModelCollectionFrequency(freq_val)

    db_metric = Metric(**metric_data)
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)

    return _add_scores_to_response(db_metric)


@router.get("/{metric_id}", response_model=MetricResponse)
async def get_metric(
    metric_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a metric by ID."""

    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    return _add_scores_to_response(metric)


@router.put("/{metric_id}", response_model=MetricResponse)
async def update_metric(
    metric_id: UUID,
    metric_update: MetricUpdate,
    db: Session = Depends(get_db),
):
    """Update a metric (full update)."""
    
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    # Check for duplicate name if updating name
    if metric_update.name and metric_update.name != metric.name:
        existing = db.query(Metric).filter(
            and_(Metric.name == metric_update.name, Metric.id != metric_id)
        ).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Metric with name '{metric_update.name}' already exists"
            )
    
    # Update fields
    update_data = metric_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(metric, field, value)
    
    # Validate target_value for non-binary metrics
    if metric.direction != "binary" and metric.target_value is None:
        raise HTTPException(
            status_code=400,
            detail="target_value is required for non-binary metrics"
        )

    db.commit()
    db.refresh(metric)

    return _add_scores_to_response(metric)


@router.patch("/{metric_id}", response_model=MetricResponse)
async def patch_metric(
    metric_id: UUID,
    metric_update: MetricUpdate,
    db: Session = Depends(get_db),
):
    """Partially update a metric."""
    return await update_metric(metric_id, metric_update, db)


@router.delete("/{metric_id}")
async def delete_metric(
    metric_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    db: Session = Depends(get_db),
):
    """Delete a metric (soft delete by default)."""
    
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    if hard_delete:
        db.delete(metric)
    else:
        metric.active = False
    
    db.commit()
    
    return {"message": "Metric deleted successfully"}


@router.post("/{metric_id}/values", response_model=MetricHistoryResponse)
async def add_metric_value(
    metric_id: UUID,
    history: MetricHistoryCreate,
    db: Session = Depends(get_db),
):
    """Add a new value to metric history and update current value."""
    
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    # Create history entry
    db_history = MetricHistory(
        metric_id=metric_id,
        **history.model_dump()
    )
    db.add(db_history)
    
    # Update current value in metric
    metric.current_value = history.normalized_value
    metric.last_collected_at = history.collected_at
    
    # Update current_label based on target_units
    if metric.target_units == "%" and history.normalized_value is not None:
        metric.current_label = f"{history.normalized_value:.1f}%"
    elif history.normalized_value is not None:
        unit = metric.target_units or ""
        metric.current_label = f"{history.normalized_value:.1f} {unit}".strip()
    
    db.commit()
    db.refresh(db_history)
    
    return MetricHistoryResponse.model_validate(db_history)


@router.get("/{metric_id}/history", response_model=List[MetricHistoryResponse])
async def get_metric_history(
    metric_id: UUID,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get metric history with pagination."""
    
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    history = (
        db.query(MetricHistory)
        .filter(MetricHistory.metric_id == metric_id)
        .order_by(desc(MetricHistory.collected_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return [MetricHistoryResponse.model_validate(h) for h in history]


@router.get("/functions/list")
async def list_csf_functions():
    """Get list of available CSF functions."""
    return {
        "functions": [
            {"code": "gv", "name": "Govern", "description": "Cybersecurity governance and management"},
            {"code": "id", "name": "Identify", "description": "Asset and risk identification"},
            {"code": "pr", "name": "Protect", "description": "Protective safeguards"},
            {"code": "de", "name": "Detect", "description": "Detection of cybersecurity events"},
            {"code": "rs", "name": "Respond", "description": "Response to cybersecurity incidents"},
            {"code": "rc", "name": "Recover", "description": "Recovery from cybersecurity incidents"},
        ]
    }


@router.get("/stats/summary")
async def get_metrics_summary(db: Session = Depends(get_db)):
    """Get summary statistics for metrics."""
    
    total_metrics = db.query(Metric).filter(Metric.active == True).count()
    
    # Count by function
    function_counts = {}
    for func in CSFFunction:
        # Find the framework function by code
        fw_func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == func.value
        ).first()
        if fw_func:
            count = db.query(Metric).filter(
                and_(Metric.function_id == fw_func.id, Metric.active == True)
            ).count()
        else:
            count = 0
        function_counts[func.value] = count
    
    # Count by priority
    priority_counts = {}
    for priority in [1, 2, 3]:
        count = db.query(Metric).filter(
            and_(Metric.priority_rank == priority, Metric.active == True)
        ).count()
        priority_counts[priority] = count
    
    # Metrics with current values
    metrics_with_values = db.query(Metric).filter(
        and_(Metric.active == True, Metric.current_value != None)
    ).count()
    
    return {
        "total_metrics": total_metrics,
        "metrics_with_values": metrics_with_values,
        "function_breakdown": function_counts,
        "priority_breakdown": priority_counts,
        "data_completeness_pct": round((metrics_with_values / total_metrics) * 100, 1) if total_metrics > 0 else 0,
    }


@router.get("/export/csv")
async def export_metrics_csv(
    framework: Optional[str] = Query(None, description="Framework code (csf_2_0, ai_rmf)"),
    function: Optional[CSFFunction] = None,
    function_code: Optional[str] = Query(None, description="Generic function code for any framework"),
    category_code: Optional[str] = None,
    subcategory_code: Optional[str] = None,
    priority_rank: Optional[int] = Query(None, ge=1, le=3),
    active: Optional[bool] = None,
    search: Optional[str] = None,
    owner_function: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export metrics to CSV with all available columns. Supports multi-framework filtering."""
    from sqlalchemy.orm import joinedload

    # Build the same query as list_metrics but without pagination
    # Use joinedload to eagerly load relationships needed for properties
    query = db.query(Metric).options(
        joinedload(Metric.function),
        joinedload(Metric.category),
        joinedload(Metric.subcategory),
    )

    # Apply the same filters as list_metrics
    filters = []

    # Framework filtering
    if framework:
        fw = db.query(Framework).filter(
            Framework.code == framework,
            Framework.active == True
        ).first()
        if fw:
            filters.append(Metric.framework_id == fw.id)

    if function:
        fw_func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == function.value
        ).first()
        if fw_func:
            filters.append(Metric.function_id == fw_func.id)

    # Generic function code filtering (multi-framework)
    if function_code:
        fw_func = db.query(FrameworkFunction).filter(
            FrameworkFunction.code == function_code.lower()
        ).first()
        if fw_func:
            filters.append(Metric.function_id == fw_func.id)

    if category_code:
        fw_cat = db.query(FrameworkCategory).filter(
            FrameworkCategory.code == category_code
        ).first()
        if fw_cat:
            filters.append(Metric.category_id == fw_cat.id)
    if subcategory_code:
        from ..models import FrameworkSubcategory
        fw_sub = db.query(FrameworkSubcategory).filter(
            FrameworkSubcategory.code == subcategory_code
        ).first()
        if fw_sub:
            filters.append(Metric.subcategory_id == fw_sub.id)
    if priority_rank:
        filters.append(Metric.priority_rank == priority_rank)
    if active is not None:
        filters.append(Metric.active == active)
    if owner_function:
        filters.append(Metric.owner_function.ilike(f"%{owner_function}%"))
    if search:
        search_filter = or_(
            Metric.name.ilike(f"%{search}%"),
            Metric.description.ilike(f"%{search}%"),
            Metric.formula.ilike(f"%{search}%"),
            Metric.notes.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if filters:
        query = query.filter(and_(*filters))
    
    # Order by metric_number for consistent export
    metrics = query.order_by(Metric.metric_number).all()
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = [
        'id', 'metric_number', 'name', 'description', 'formula', 'calc_expr_json',
        'framework_id', 'function_id', 'category_id', 'subcategory_id',
        'trustworthiness_characteristic', 'ai_profile_focus',
        'priority_rank', 'weight', 'direction', 'target_value', 'target_units',
        'tolerance_low', 'tolerance_high', 'owner_function', 'data_source',
        'collection_frequency', 'last_collected_at', 'current_value', 'current_label',
        'notes', 'risk_definition', 'active', 'locked', 'locked_by', 'locked_at',
        'created_at', 'updated_at'
    ]

    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for metric in metrics:
        writer.writerow({
            'id': str(metric.id) if metric.id else '',
            'metric_number': metric.metric_number or '',
            'name': metric.name or '',
            'description': metric.description or '',
            'formula': metric.formula or '',
            'calc_expr_json': json.dumps(metric.calc_expr_json) if metric.calc_expr_json else '',
            'framework_id': str(metric.framework_id) if metric.framework_id else '',
            'function_id': str(metric.function_id) if metric.function_id else '',
            'category_id': str(metric.category_id) if metric.category_id else '',
            'subcategory_id': str(metric.subcategory_id) if metric.subcategory_id else '',
            'trustworthiness_characteristic': metric.trustworthiness_characteristic or '',
            'ai_profile_focus': metric.ai_profile_focus or '',
            'priority_rank': metric.priority_rank or '',
            'weight': float(metric.weight) if metric.weight is not None else '',
            'direction': metric.direction.value if metric.direction else '',
            'target_value': float(metric.target_value) if metric.target_value is not None else '',
            'target_units': metric.target_units or '',
            'tolerance_low': float(metric.tolerance_low) if metric.tolerance_low is not None else '',
            'tolerance_high': float(metric.tolerance_high) if metric.tolerance_high is not None else '',
            'owner_function': metric.owner_function or '',
            'data_source': metric.data_source or '',
            'collection_frequency': metric.collection_frequency.value if metric.collection_frequency else '',
            'current_value': float(metric.current_value) if metric.current_value is not None else '',
            'current_label': metric.current_label or '',
            'last_collected_at': metric.last_collected_at.isoformat() if metric.last_collected_at else '',
            'notes': metric.notes or '',
            'risk_definition': metric.risk_definition or '',
            'active': metric.active,
            'locked': metric.locked,
            'locked_by': metric.locked_by or '',
            'locked_at': metric.locked_at.isoformat() if metric.locked_at else '',
            'created_at': metric.created_at.isoformat() if metric.created_at else '',
            'updated_at': metric.updated_at.isoformat() if metric.updated_at else '',
        })
    
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"metrics_export_{timestamp}.csv"
    
    # Return CSV as streaming response
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==============================================================================
# LOCK/UNLOCK ENDPOINTS
# ==============================================================================

@router.post("/{metric_id}/lock", response_model=MetricResponse)
async def lock_metric(
    metric_id: UUID,
    locked_by: Optional[str] = Query(None, description="User who locked the metric"),
    db: Session = Depends(get_db),
):
    """Lock a metric to prevent editing."""

    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    if metric.locked:
        raise HTTPException(status_code=400, detail="Metric is already locked")

    metric.locked = True
    metric.locked_by = locked_by or "system"
    metric.locked_at = datetime.utcnow()

    db.commit()
    db.refresh(metric)

    return _add_scores_to_response(metric)


@router.post("/{metric_id}/unlock", response_model=MetricResponse)
async def unlock_metric(
    metric_id: UUID,
    unlocked_by: Optional[str] = Query(None, description="User who unlocked the metric"),
    db: Session = Depends(get_db),
):
    """Unlock a metric to allow editing."""

    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    if not metric.locked:
        raise HTTPException(status_code=400, detail="Metric is already unlocked")

    metric.locked = False
    metric.locked_by = unlocked_by or "system"
    metric.locked_at = datetime.utcnow()

    db.commit()
    db.refresh(metric)

    return _add_scores_to_response(metric)


@router.patch("/{metric_id}/field")
async def update_metric_field(
    metric_id: UUID,
    field: str = Query(..., description="Field name to update"),
    value: str = Query(..., description="New value for the field"),
    db: Session = Depends(get_db),
):
    """Update a single field of a metric (requires metric to be unlocked).

    Supported fields:
    - priority_rank (1, 2, or 3)
    - direction (higher_is_better, lower_is_better, target_range, binary)
    - target_value (numeric)
    - current_value (numeric)
    - target_units (string)
    - owner_function (string)
    - data_source (string)
    - collection_frequency (daily, weekly, monthly, quarterly, ad_hoc)
    - notes (string)
    - active (true/false)
    """

    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    # Check if metric is locked
    if metric.locked:
        raise HTTPException(
            status_code=403,
            detail="Metric is locked. Unlock it before editing."
        )

    # Define allowed fields and their types
    allowed_fields = {
        'priority_rank': 'int',
        'direction': 'enum',
        'target_value': 'numeric',
        'current_value': 'numeric',
        'target_units': 'string',
        'tolerance_low': 'numeric',
        'tolerance_high': 'numeric',
        'owner_function': 'string',
        'data_source': 'string',
        'collection_frequency': 'enum',
        'notes': 'string',
        'active': 'bool',
        'weight': 'numeric',
    }

    if field not in allowed_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Field '{field}' cannot be updated. Allowed fields: {list(allowed_fields.keys())}"
        )

    # Parse and validate the value based on field type
    field_type = allowed_fields[field]
    try:
        if field_type == 'int':
            parsed_value = int(value)
            if field == 'priority_rank' and parsed_value not in [1, 2, 3]:
                raise ValueError("priority_rank must be 1, 2, or 3")
        elif field_type == 'numeric':
            parsed_value = float(value) if value else None
        elif field_type == 'bool':
            parsed_value = value.lower() in ('true', '1', 'yes')
        elif field_type == 'enum':
            if field == 'direction':
                from ..models import MetricDirection
                valid_values = [e.value for e in MetricDirection]
                if value not in valid_values:
                    raise ValueError(f"direction must be one of: {valid_values}")
                parsed_value = MetricDirection(value)
            elif field == 'collection_frequency':
                from ..models import CollectionFrequency
                valid_values = [e.value for e in CollectionFrequency]
                if value not in valid_values:
                    raise ValueError(f"collection_frequency must be one of: {valid_values}")
                parsed_value = CollectionFrequency(value)
        else:
            parsed_value = value
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update the field
    setattr(metric, field, parsed_value)

    # If updating current_value, also update current_label
    if field == 'current_value' and parsed_value is not None:
        if metric.target_units == "%" or metric.target_units == "percent":
            metric.current_label = f"{parsed_value:.1f}%"
        elif metric.target_units:
            metric.current_label = f"{parsed_value:.1f} {metric.target_units}"
        else:
            metric.current_label = f"{parsed_value:.1f}"
        metric.last_collected_at = datetime.utcnow()

    db.commit()
    db.refresh(metric)

    return {
        "message": f"Field '{field}' updated successfully",
        "metric_id": str(metric.id),
        "field": field,
        "new_value": str(parsed_value) if parsed_value is not None else None,
        "locked": metric.locked,
    }


@router.post("/{metric_id}/toggle-lock", response_model=MetricResponse)
async def toggle_metric_lock(
    metric_id: UUID,
    user: Optional[str] = Query(None, description="User performing the action"),
    db: Session = Depends(get_db),
):
    """Toggle the lock state of a metric."""

    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    # Toggle the lock state
    metric.locked = not metric.locked
    metric.locked_by = user or "system"
    metric.locked_at = datetime.utcnow()

    db.commit()
    db.refresh(metric)

    return _add_scores_to_response(metric)