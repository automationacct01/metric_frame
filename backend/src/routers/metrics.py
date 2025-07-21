"""CRUD API endpoints for metrics management."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from ..db import get_db
from ..models import Metric, MetricHistory
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

router = APIRouter()


@router.get("/", response_model=MetricListResponse)
async def list_metrics(
    function: Optional[CSFFunction] = None,
    priority_rank: Optional[int] = Query(None, ge=1, le=3),
    active: Optional[bool] = None,
    search: Optional[str] = None,
    owner_function: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List metrics with filtering and pagination."""
    
    query = db.query(Metric)
    
    # Apply filters
    filters = []
    if function:
        filters.append(Metric.csf_function == function)
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
        .order_by(Metric.priority_rank, Metric.csf_function, Metric.name)
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return MetricListResponse(
        items=[MetricResponse.model_validate(item) for item in items],
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
    
    db_metric = Metric(**metric.model_dump())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    
    return MetricResponse.model_validate(db_metric)


@router.get("/{metric_id}", response_model=MetricResponse)
async def get_metric(
    metric_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a metric by ID."""
    
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    return MetricResponse.model_validate(metric)


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
    
    return MetricResponse.model_validate(metric)


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
        count = db.query(Metric).filter(
            and_(Metric.csf_function == func, Metric.active == True)
        ).count()
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