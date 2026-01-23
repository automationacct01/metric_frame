"""API endpoints for metric catalog management.

Supports multi-framework catalog imports and AI-powered mapping.
"""

import os
import tempfile
import logging
import csv
import io
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError

from ..db import get_db
from ..models import MetricCatalog, MetricCatalogItem, MetricCatalogCSFMapping, CSFFunction, MetricDirection, CollectionFrequency, Framework
from ..schemas import (
    MetricCatalogResponse,
    MetricCatalogCreate,
    CatalogImportRequest,
    CatalogImportResponse,
    CatalogMappingSuggestion,
    CatalogActivationRequest,
    MetricCatalogCSFMappingCreate,
    MetricCatalogCSFMappingResponse,
    MetricResponse,
    MetricListResponse
)
from ..services.claude_client import claude_client, generate_csf_mapping_suggestions, generate_metric_enhancement_suggestions

router = APIRouter(prefix="/catalogs", tags=["catalogs"])


def _compute_catalog_item_score(current_value, target_value, direction, tolerance_low=None, tolerance_high=None) -> Optional[float]:
    """Compute performance score for a catalog item (0-100 percentage)."""
    if current_value is None:
        return None

    current = float(current_value)
    target = float(target_value) if target_value is not None else None

    # Handle direction as string or enum
    dir_value = direction.value if hasattr(direction, 'value') else direction

    if dir_value == 'binary':
        return 100.0 if bool(current) else 0.0

    if target is None:
        return None

    if dir_value == 'higher_is_better':
        score = min(1.0, max(0.0, current / target)) if target > 0 else 0.0
    elif dir_value == 'lower_is_better':
        # Score = target/current, so approaching target from above increases score
        # At target: 100%, at 2x target: 50%, at 4x target: 25%, etc.
        if current == 0:
            score = 1.0  # At or below target (0 is best possible)
        elif target == 0:
            score = 0.01  # Target is 0 but we have some value - minimal score
        else:
            score = min(1.0, target / current)
    elif dir_value == 'target_range':
        low = float(tolerance_low) if tolerance_low else target
        high = float(tolerance_high) if tolerance_high else target
        if low <= current <= high:
            score = 1.0
        else:
            distance = min(abs(current - low), abs(current - high))
            range_span = max(high - low, 1.0)
            penalty_factor = min(2.0, distance / range_span)
            score = max(0.0, 1.0 - penalty_factor)
    else:
        return None

    return score * 100  # Convert to percentage


def _compute_catalog_item_gap(current_value, target_value, direction) -> Optional[float]:
    """Compute gap to target for a catalog item."""
    if current_value is None or target_value is None:
        return None

    dir_value = direction.value if hasattr(direction, 'value') else direction
    if dir_value == 'binary':
        return None

    current = float(current_value)
    target = float(target_value)

    if target == 0:
        return None

    gap_pct = ((current - target) / target) * 100

    if dir_value == 'lower_is_better':
        gap_pct = -gap_pct

    return gap_pct


@router.get("/", response_model=List[MetricCatalogResponse])
async def list_catalogs(
    owner: Optional[str] = None,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all metric catalogs."""
    query = db.query(MetricCatalog)
    
    if owner:
        query = query.filter(MetricCatalog.owner == owner)
    
    if active_only:
        query = query.filter(MetricCatalog.active == True)
    
    # Add items count as a computed field
    query = query.outerjoin(MetricCatalogItem).group_by(MetricCatalog.id).add_columns(
        func.count(MetricCatalogItem.id).label('items_count')
    )
    
    catalogs = []
    for catalog, items_count in query.all():
        catalog_dict = {
            "id": catalog.id,
            "name": catalog.name,
            "description": catalog.description,
            "owner": catalog.owner,
            "active": catalog.active,
            "is_default": catalog.is_default,
            "file_format": catalog.file_format,
            "original_filename": catalog.original_filename,
            "created_at": catalog.created_at,
            "updated_at": catalog.updated_at,
            "items_count": items_count or 0
        }
        catalogs.append(MetricCatalogResponse(**catalog_dict))
    
    return catalogs


@router.post("/upload", response_model=CatalogImportResponse)
async def upload_catalog(
    file: UploadFile = File(...),
    catalog_name: str = Form(...),
    description: Optional[str] = Form(None),
    owner: Optional[str] = Form(None),
    framework: str = Form("csf_2_0", description="Target framework (csf_2_0, ai_rmf)"),
    db: Session = Depends(get_db)
):
    """
    Upload and import a metric catalog file.

    Supports multi-framework catalogs:
    - csf_2_0: NIST Cybersecurity Framework 2.0 (default)
    - ai_rmf: NIST AI Risk Management Framework 1.0
    - cyber_ai_profile: NIST Cyber AI Profile

    AI-powered mapping uses Claude to suggest framework mappings for each metric.
    """

    # Validate framework
    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework. Must be one of: {valid_frameworks}"
        )

    # Validate file format
    file_ext = file.filename.split('.')[-1].lower() if file.filename else ''
    if file_ext not in ['csv', 'json']:
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")

    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Parse the file
        if file_ext == 'csv':
            df = pd.read_csv(temp_file_path)
        else:  # json
            df = pd.read_json(temp_file_path)

        # Get framework ID if not CSF 2.0
        framework_id = None
        if framework != "csf_2_0":
            fw = db.query(Framework).filter(
                Framework.code == framework,
                Framework.active == True
            ).first()
            if fw:
                framework_id = fw.id

        # Create catalog record
        catalog = MetricCatalog(
            name=catalog_name,
            description=description,
            owner=owner,
            file_format=file_ext,
            original_filename=file.filename,
            active=False  # Starts inactive until mapping is complete
        )
        db.add(catalog)
        db.flush()  # Get the catalog ID
        
        # Import catalog items
        items_imported = 0
        import_errors = []
        
        for index, row in df.iterrows():
            try:
                # Map required fields with validation
                direction_mapping = {
                    'higher_is_better': MetricDirection.HIGHER_IS_BETTER,
                    'lower_is_better': MetricDirection.LOWER_IS_BETTER,
                    'target_range': MetricDirection.TARGET_RANGE,
                    'binary': MetricDirection.BINARY,
                    # Support variations
                    'higher': MetricDirection.HIGHER_IS_BETTER,
                    'lower': MetricDirection.LOWER_IS_BETTER,
                    'range': MetricDirection.TARGET_RANGE,
                    'bool': MetricDirection.BINARY,
                    'boolean': MetricDirection.BINARY
                }
                
                # Extract required fields
                metric_id = str(row.get('metric_id', row.get('id', f"metric_{index + 1}")))
                name = str(row.get('name', row.get('metric_name', f"Metric {index + 1}")))
                
                direction_str = str(row.get('direction', 'higher_is_better')).lower()
                direction = direction_mapping.get(direction_str)
                if not direction:
                    import_errors.append(f"Row {index + 1}: Invalid direction '{direction_str}'")
                    continue
                
                # Create catalog item
                catalog_item = MetricCatalogItem(
                    catalog_id=catalog.id,
                    metric_id=metric_id,
                    name=name,
                    description=row.get('description'),
                    formula=row.get('formula'),
                    direction=direction,
                    target_value=pd.to_numeric(row.get('target_value'), errors='coerce'),
                    target_units=row.get('target_units'),
                    tolerance_low=pd.to_numeric(row.get('tolerance_low'), errors='coerce'),
                    tolerance_high=pd.to_numeric(row.get('tolerance_high'), errors='coerce'),
                    priority_rank=int(row.get('priority_rank', 2)),
                    weight=float(row.get('weight', 1.0)),
                    owner_function=row.get('owner_function'),
                    data_source=row.get('data_source'),
                    current_value=pd.to_numeric(row.get('current_value'), errors='coerce'),
                    current_label=row.get('current_label'),
                    original_row_data=row.to_dict(),
                    import_notes=f"Imported from {file.filename}"
                )
                
                # Handle collection frequency
                freq_str = row.get('collection_frequency')
                if freq_str:
                    freq_mapping = {
                        'daily': CollectionFrequency.DAILY,
                        'weekly': CollectionFrequency.WEEKLY,
                        'monthly': CollectionFrequency.MONTHLY,
                        'quarterly': CollectionFrequency.QUARTERLY,
                        'ad_hoc': CollectionFrequency.AD_HOC
                    }
                    catalog_item.collection_frequency = freq_mapping.get(str(freq_str).lower())
                
                db.add(catalog_item)
                items_imported += 1
                
            except Exception as e:
                import_errors.append(f"Row {index + 1}: {str(e)}")
        
        # Generate AI-powered framework mapping suggestions
        suggested_mappings = []
        try:
            if items_imported > 0:
                # Use Claude client for multi-framework mapping
                suggestions = await claude_client.generate_framework_mappings(catalog.id, framework, db)
                suggested_mappings = [s.model_dump() for s in suggestions]
        except Exception as e:
            import_errors.append(f"AI mapping generation failed: {str(e)}")
        
        db.commit()
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        return CatalogImportResponse(
            catalog_id=catalog.id,
            items_imported=items_imported,
            import_errors=import_errors,
            suggested_mappings=suggested_mappings
        )
        
    except Exception as e:
        db.rollback()
        # Clean up temp file if exists
        if 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/{catalog_id}/mappings", response_model=List[CatalogMappingSuggestion])
async def get_catalog_mappings(
    catalog_id: UUID,
    framework: str = Query("csf_2_0", description="Target framework for mapping"),
    db: Session = Depends(get_db)
):
    """
    Get framework mapping suggestions for a catalog.

    Uses Claude AI to analyze metrics and suggest appropriate framework mappings.
    """
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")

    valid_frameworks = ["csf_2_0", "ai_rmf", "cyber_ai_profile"]
    if framework not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid framework. Must be one of: {valid_frameworks}"
        )

    try:
        suggestions = await claude_client.generate_framework_mappings(catalog_id, framework, db)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate mappings: {str(e)}")


@router.get("/{catalog_id}/enhancements")
async def get_catalog_enhancements(
    catalog_id: UUID,
    framework: str = Query("csf_2_0", description="Framework for enhancement context"),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered metric enhancement suggestions for a catalog.

    Claude analyzes each metric and suggests optimal configurations
    for priority, owner function, data source, and collection frequency.
    """
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")

    try:
        enhancements = await claude_client.enhance_catalog_metrics(catalog_id, framework, db)
        return enhancements
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate enhancements: {str(e)}")


@router.post("/{catalog_id}/mappings", response_model=List[MetricCatalogCSFMappingResponse])
async def save_catalog_mappings(
    catalog_id: UUID,
    mappings: List[MetricCatalogCSFMappingCreate],
    db: Session = Depends(get_db)
):
    """Save CSF mappings for catalog items."""
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")
    
    try:
        # Delete existing mappings for this catalog
        db.query(MetricCatalogCSFMapping).filter(
            MetricCatalogCSFMapping.catalog_id == catalog_id
        ).delete()
        
        # Create new mappings
        saved_mappings = []
        for mapping_data in mappings:
            # Convert mapping data with explicit enum handling
            mapping_dict = mapping_data.model_dump()
            
            # Ensure CSF function is properly converted to enum
            if 'csf_function' in mapping_dict:
                csf_func_str = mapping_dict['csf_function']
                if isinstance(csf_func_str, str):
                    mapping_dict['csf_function'] = CSFFunction(csf_func_str)
            
            mapping = MetricCatalogCSFMapping(
                catalog_id=catalog_id,
                **mapping_dict
            )
            db.add(mapping)
            saved_mappings.append(mapping)
        
        db.commit()
        
        # Refresh to get IDs and timestamps
        response_mappings = []
        for mapping in saved_mappings:
            db.refresh(mapping)
            response_mappings.append(MetricCatalogCSFMappingResponse.model_validate(mapping))
        
        return response_mappings
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save mappings: {str(e)}")


@router.post("/{catalog_id}/activate", response_model=MetricCatalogResponse)
async def activate_catalog(
    catalog_id: UUID,
    request: CatalogActivationRequest,
    db: Session = Depends(get_db)
):
    """Activate or deactivate a catalog."""
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")
    
    try:
        if request.activate:
            # Deactivate all other catalogs for this owner
            db.query(MetricCatalog).filter(
                MetricCatalog.owner == catalog.owner,
                MetricCatalog.id != catalog_id
            ).update({"active": False})
            
            catalog.active = True
        else:
            catalog.active = False
        
        db.commit()
        db.refresh(catalog)
        
        return MetricCatalogResponse.model_validate(catalog)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to activate catalog: {str(e)}")


@router.get("/{catalog_id}", response_model=MetricCatalogResponse)
async def get_catalog(
    catalog_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific catalog by ID."""
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")
    
    # Get items count
    items_count = db.query(MetricCatalogItem).filter(
        MetricCatalogItem.catalog_id == catalog_id
    ).count()
    
    catalog_dict = {
        "id": catalog.id,
        "name": catalog.name,
        "description": catalog.description,
        "owner": catalog.owner,
        "active": catalog.active,
        "is_default": catalog.is_default,
        "file_format": catalog.file_format,
        "original_filename": catalog.original_filename,
        "created_at": catalog.created_at,
        "updated_at": catalog.updated_at,
        "items_count": items_count
    }
    
    return MetricCatalogResponse(**catalog_dict)


@router.delete("/{catalog_id}")
async def delete_catalog(
    catalog_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a catalog and all its items."""
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")
    
    try:
        # CASCADE delete will handle related items and mappings
        db.delete(catalog)
        db.commit()
        
        return {"message": "Catalog deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete catalog: {str(e)}")


def safe_float(value) -> float | None:
    """Safely convert a value to float, handling None, Decimal, and invalid values."""
    if value is None:
        return None
    try:
        float_val = float(value)
        # Check for NaN, infinity
        if not (float_val == float_val) or float_val == float('inf') or float_val == float('-inf'):
            return None
        return float_val
    except (ValueError, TypeError, OverflowError):
        return None

def convert_catalog_item_to_metric(item: MetricCatalogItem, mapping: MetricCatalogCSFMapping = None) -> dict:
    """Convert a catalog item to metric format for API response."""

    # Generate a synthetic metric number if not available
    metric_number = f"C{str(item.id)[:8]}"

    current_val = safe_float(item.current_value)
    target_val = safe_float(item.target_value)
    tol_low = safe_float(item.tolerance_low)
    tol_high = safe_float(item.tolerance_high)

    # Calculate scores
    metric_score = _compute_catalog_item_score(
        current_val, target_val, item.direction, tol_low, tol_high
    ) if item.direction else None
    gap_to_target = _compute_catalog_item_gap(
        current_val, target_val, item.direction
    ) if item.direction else None

    metric_data = {
        "id": item.id,
        "metric_number": metric_number,
        "name": item.name,
        "description": item.description,
        "formula": item.formula,
        "calc_expr_json": None,
        "csf_function": mapping.csf_function if mapping else None,
        "csf_category_code": mapping.csf_category_code if mapping else None,
        "csf_subcategory_code": mapping.csf_subcategory_code if mapping else None,
        "csf_category_name": mapping.csf_category_name if mapping else None,
        "csf_subcategory_outcome": mapping.csf_subcategory_outcome if mapping else None,
        "priority_rank": item.priority_rank,
        "weight": safe_float(item.weight) or 1.0,
        "direction": item.direction,
        "target_value": target_val,
        "target_units": item.target_units,
        "tolerance_low": tol_low,
        "tolerance_high": tol_high,
        "owner_function": item.owner_function,
        "data_source": item.data_source,
        "collection_frequency": item.collection_frequency,
        "last_collected_at": None,
        "current_value": current_val,
        "current_label": item.current_label,
        "notes": item.import_notes,
        "active": True,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "metric_score": metric_score,
        "gap_to_target": gap_to_target
    }

    return metric_data


@router.get("/active/metrics", response_model=MetricListResponse)
async def get_active_catalog_metrics(
    owner: str = "admin",
    function: Optional[CSFFunction] = None,
    priority_rank: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get metrics from the active catalog for the specified owner."""
    
    # Find active catalog for the owner
    active_catalog = db.query(MetricCatalog).filter(
        MetricCatalog.owner == owner,
        MetricCatalog.active == True
    ).first()
    
    if not active_catalog:
        raise HTTPException(status_code=404, detail="No active catalog found for this owner")
    
    try:
        # Query catalog items with their CSF mappings
        if function:
            # When filtering by function, use inner join to ensure we only get items with mappings
            logging.info(f"Filtering active catalog metrics by function: {function}")
            query = db.query(MetricCatalogItem, MetricCatalogCSFMapping).filter(
                MetricCatalogItem.catalog_id == active_catalog.id
            ).join(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            ).filter(MetricCatalogCSFMapping.csf_function == function)
        else:
            # When not filtering by function, use outer join to get all items
            query = db.query(MetricCatalogItem, MetricCatalogCSFMapping).filter(
                MetricCatalogItem.catalog_id == active_catalog.id
            ).outerjoin(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            )
        
        # Apply additional filters
        if priority_rank:
            query = query.filter(MetricCatalogItem.priority_rank == priority_rank)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    MetricCatalogItem.name.ilike(search_term),
                    MetricCatalogItem.description.ilike(search_term)
                )
            )
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        items = query.offset(offset).limit(limit).all()
        
    except SQLAlchemyError as e:
        logging.error(f"Database error when querying active catalog metrics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database error when retrieving catalog metrics: {str(e)}"
        )
    except Exception as e:
        logging.error(f"Unexpected error when querying active catalog metrics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error when retrieving catalog metrics: {str(e)}"
        )
    
    # Convert to metric format
    metrics = []
    for item, mapping in items:
        metric_data = convert_catalog_item_to_metric(item, mapping)
        metrics.append(MetricResponse(**metric_data))
    
    has_more = (offset + limit) < total
    
    return MetricListResponse(
        items=metrics,
        total=total,
        limit=limit,
        offset=offset,
        has_more=has_more
    )


@router.get("/active/metrics/export/csv")
async def export_active_catalog_metrics_csv(
    owner: str = "admin",
    function: Optional[CSFFunction] = None,
    priority_rank: Optional[int] = Query(None, ge=1, le=3),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Export active catalog metrics to CSV with all available columns."""
    
    # Find active catalog for the owner
    active_catalog = db.query(MetricCatalog).filter(
        MetricCatalog.owner == owner,
        MetricCatalog.active == True
    ).first()
    
    if not active_catalog:
        raise HTTPException(status_code=404, detail="No active catalog found for this owner")
    
    try:
        # Build the same query as get_active_catalog_metrics but without pagination
        if function:
            query = db.query(MetricCatalogItem, MetricCatalogCSFMapping).filter(
                MetricCatalogItem.catalog_id == active_catalog.id
            ).join(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            ).filter(MetricCatalogCSFMapping.csf_function == function)
        else:
            query = db.query(MetricCatalogItem, MetricCatalogCSFMapping).filter(
                MetricCatalogItem.catalog_id == active_catalog.id
            ).outerjoin(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            )
        
        # Apply additional filters
        if priority_rank:
            query = query.filter(MetricCatalogItem.priority_rank == priority_rank)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    MetricCatalogItem.name.ilike(search_term),
                    MetricCatalogItem.description.ilike(search_term)
                )
            )
        
        # Get all items without pagination
        items = query.all()
        
    except SQLAlchemyError as e:
        logging.error(f"Database error when exporting active catalog metrics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database error when exporting catalog metrics: {str(e)}"
        )
    except Exception as e:
        logging.error(f"Unexpected error when exporting active catalog metrics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error when exporting catalog metrics: {str(e)}"
        )
    
    # Convert to metric format and prepare CSV data
    output = io.StringIO()
    
    # Define CSV columns based on the metric structure
    fieldnames = [
        'id', 'metric_number', 'name', 'description', 'formula',
        'csf_function', 'csf_category_code', 'csf_subcategory_code',
        'csf_category_name', 'csf_subcategory_outcome',
        'priority_rank', 'weight', 'direction', 'target_value', 'target_units',
        'tolerance_low', 'tolerance_high', 'owner_function', 'data_source',
        'collection_frequency', 'current_value', 'current_label', 'notes',
        'active', 'created_at', 'updated_at'
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for item, mapping in items:
        metric_data = convert_catalog_item_to_metric(item, mapping)
        # Convert datetime objects to strings for CSV
        if metric_data.get('created_at'):
            metric_data['created_at'] = metric_data['created_at'].isoformat()
        if metric_data.get('updated_at'):
            metric_data['updated_at'] = metric_data['updated_at'].isoformat()
        writer.writerow(metric_data)
    
    # Prepare the response
    output.seek(0)
    
    # Create filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"active_catalog_metrics_{timestamp}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type='text/csv',
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )