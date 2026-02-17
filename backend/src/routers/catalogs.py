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
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from ..db import get_db
from ..models import MetricCatalog, MetricCatalogItem, MetricCatalogCSFMapping, CSFFunction, MetricDirection, CollectionFrequency, Framework, FrameworkFunction, FrameworkCategory, FrameworkSubcategory, User as UserModel, MappingMethod, Metric
from .auth import get_current_user, require_editor, require_admin
from ..schemas import (
    MetricCatalogResponse,
    MetricCatalogCreate,
    CatalogImportRequest,
    CatalogImportResponse,
    CatalogMappingSuggestion,
    CatalogActivationRequest,
    CatalogCloneRequest,
    CatalogCloneResponse,
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
            score = 0.0  # Target is 0 but we have some value - complete failure to meet goal
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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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


def clean_row_for_json(row_dict: dict) -> dict:
    """Replace NaN/inf/pandas special values with None for JSON serialization.

    This is needed because pandas NaN values cannot be serialized to JSON,
    and PostgreSQL JSON columns will reject them.
    """
    import math
    import pandas as pd

    cleaned = {}
    for k, v in row_dict.items():
        if pd.isna(v):
            cleaned[k] = None
        elif isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            cleaned[k] = None
        else:
            cleaned[k] = v
    return cleaned


@router.post("/upload", response_model=CatalogImportResponse)
@limiter.limit("10/minute")
async def upload_catalog(
    request: Request,
    file: UploadFile = File(...),
    catalog_name: str = Form(...),
    description: Optional[str] = Form(None),
    owner: Optional[str] = Form(None),
    framework: str = Form("csf_2_0", description="Target framework (csf_2_0, ai_rmf)"),
    db: Session = Depends(get_db),
    _editor: UserModel = Depends(require_editor),
):
    """
    Upload and import a metric catalog file.

    Supports multi-framework catalogs:
    - csf_2_0: NIST Cybersecurity Framework 2.0 (default)
    - ai_rmf: NIST AI Risk Management Framework 1.0
    - cyber_ai_profile: NIST Cyber AI Profile

    AI-powered mapping uses Claude to suggest framework mappings for each metric.
    """

    # Enforce file size limit (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is 10MB, got {len(content) / (1024*1024):.1f}MB"
        )
    # Reset file position for downstream processing
    await file.seek(0)

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

        # Get framework ID (required for all frameworks)
        fw = db.query(Framework).filter(
            Framework.code == framework,
            Framework.active == True
        ).first()
        if not fw:
            raise HTTPException(
                status_code=400,
                detail=f"Framework '{framework}' not found or inactive"
            )
        framework_id = fw.id

        # Create catalog record
        catalog = MetricCatalog(
            name=catalog_name,
            description=description,
            owner=owner or _editor.email,  # Default to current user's email
            framework_id=framework_id,
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
                    target_units=row.get('target_units') or row.get('unit'),
                    tolerance_low=pd.to_numeric(row.get('tolerance_low'), errors='coerce'),
                    tolerance_high=pd.to_numeric(row.get('tolerance_high'), errors='coerce'),
                    priority_rank=int(row.get('priority_rank', 2)),
                    weight=float(row.get('weight', 1.0)),
                    owner_function=row.get('owner_function'),
                    data_source=row.get('data_source'),
                    current_value=pd.to_numeric(row.get('current_value'), errors='coerce'),
                    current_label=row.get('current_label'),
                    original_row_data=clean_row_for_json(row.to_dict()),
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
        ai_mapping_status = "skipped"
        ai_mapping_error = None

        try:
            if items_imported > 0:
                # Use Claude client for multi-framework mapping
                suggestions = await claude_client.generate_framework_mappings(catalog.id, framework, db)
                suggested_mappings = [s.model_dump() for s in suggestions]
                ai_mapping_status = "success" if suggested_mappings else "no_mappings"
        except Exception as e:
            ai_mapping_status = "failed"
            ai_mapping_error = str(e)
            import_errors.append(f"AI mapping generation failed: {str(e)}")

        db.commit()

        # Clean up temp file
        os.unlink(temp_file_path)

        return CatalogImportResponse(
            catalog_id=catalog.id,
            items_imported=items_imported,
            import_errors=import_errors,
            suggested_mappings=suggested_mappings,
            ai_mapping_status=ai_mapping_status,
            ai_mapping_error=ai_mapping_error
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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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


@router.post("/{catalog_id}/enhancements/apply")
async def apply_catalog_enhancements(
    catalog_id: UUID,
    enhancements: List[dict],
    db: Session = Depends(get_db),
    _editor: UserModel = Depends(require_editor),
):
    """
    Apply accepted enhancements to catalog items.

    Each enhancement should contain:
    - catalog_item_id: UUID of the item to update
    - suggested_priority: int (1, 2, or 3)
    - suggested_owner_function: str
    - suggested_data_source: str
    - suggested_collection_frequency: str
    - suggested_formula: str (optional)
    - suggested_risk_definition: str (optional)
    - suggested_business_impact: str (optional)
    """
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")

    try:
        updated_count = 0
        for enhancement in enhancements:
            item_id = enhancement.get("catalog_item_id")
            if not item_id:
                continue

            item = db.query(MetricCatalogItem).filter(
                MetricCatalogItem.id == item_id,
                MetricCatalogItem.catalog_id == catalog_id
            ).first()

            if not item:
                continue

            # Apply enhancements
            if "suggested_priority" in enhancement:
                item.priority_rank = enhancement["suggested_priority"]
            if "suggested_owner_function" in enhancement:
                item.owner_function = enhancement["suggested_owner_function"]
            if "suggested_data_source" in enhancement:
                item.data_source = enhancement["suggested_data_source"]
            if "suggested_collection_frequency" in enhancement:
                freq_value = enhancement["suggested_collection_frequency"]
                if freq_value:
                    try:
                        item.collection_frequency = CollectionFrequency(freq_value)
                    except (ValueError, KeyError):
                        pass  # Ignore invalid frequency values
            if "suggested_formula" in enhancement and enhancement["suggested_formula"]:
                item.formula = enhancement["suggested_formula"]
            if "suggested_risk_definition" in enhancement and enhancement["suggested_risk_definition"]:
                item.risk_definition = enhancement["suggested_risk_definition"]
            if "suggested_business_impact" in enhancement and enhancement["suggested_business_impact"]:
                item.business_impact = enhancement["suggested_business_impact"]

            updated_count += 1

        db.commit()
        return {"message": f"Applied enhancements to {updated_count} metrics", "updated_count": updated_count}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to apply enhancements: {str(e)}")


@router.post("/{catalog_id}/mappings", response_model=List[MetricCatalogCSFMappingResponse])
async def save_catalog_mappings(
    catalog_id: UUID,
    mappings: List[MetricCatalogCSFMappingCreate],
    db: Session = Depends(get_db),
    _editor: UserModel = Depends(require_editor),
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
            # Look up function_id from csf_function enum
            csf_func = mapping_data.csf_function
            func_code = csf_func.value if hasattr(csf_func, 'value') else str(csf_func)

            # Find the framework function by code (e.g., 'de' for DETECT)
            framework_func = db.query(FrameworkFunction).filter(
                FrameworkFunction.code == func_code.lower()
            ).first()

            if not framework_func:
                raise HTTPException(
                    status_code=400,
                    detail=f"Framework function '{func_code}' not found"
                )

            # Look up category_id from csf_category_code if provided
            category_id = None
            if mapping_data.csf_category_code:
                category = db.query(FrameworkCategory).filter(
                    FrameworkCategory.code == mapping_data.csf_category_code,
                    FrameworkCategory.function_id == framework_func.id
                ).first()
                if category:
                    category_id = category.id

            # Look up subcategory_id from csf_subcategory_code if provided
            subcategory_id = None
            if mapping_data.csf_subcategory_code and category_id:
                subcategory = db.query(FrameworkSubcategory).filter(
                    FrameworkSubcategory.code == mapping_data.csf_subcategory_code,
                    FrameworkSubcategory.category_id == category_id
                ).first()
                if subcategory:
                    subcategory_id = subcategory.id

            # Convert mapping_method string to enum (handle case insensitivity)
            method_value = mapping_data.mapping_method
            if isinstance(method_value, str):
                # Map string to MappingMethod enum
                method_map = {
                    'auto': MappingMethod.AUTO,
                    'manual': MappingMethod.MANUAL,
                    'suggested': MappingMethod.SUGGESTED,
                }
                method_value = method_map.get(method_value.lower(), MappingMethod.AUTO)

            # Create mapping with proper FK IDs
            mapping = MetricCatalogCSFMapping(
                catalog_id=catalog_id,
                catalog_item_id=mapping_data.catalog_item_id,
                function_id=framework_func.id,
                category_id=category_id,
                subcategory_id=subcategory_id,
                confidence_score=mapping_data.confidence_score,
                mapping_method=method_value,
                mapping_notes=mapping_data.mapping_notes
            )
            db.add(mapping)
            saved_mappings.append(mapping)
        
        db.commit()

        # Generate framework-appropriate metric IDs based on the mappings
        # Determine prefix based on catalog's framework
        framework = db.query(Framework).filter(Framework.id == catalog.framework_id).first()
        if framework and framework.code == 'ai_rmf':
            id_prefix = "AIRMF"
        else:
            id_prefix = "CSF"

        # Group mappings by function to assign sequential numbers
        from collections import defaultdict
        function_items = defaultdict(list)

        for mapping in saved_mappings:
            # Get the function code from the framework function
            if mapping.function_id:
                func = db.query(FrameworkFunction).filter(
                    FrameworkFunction.id == mapping.function_id
                ).first()
                if func:
                    function_code = func.code.upper()  # e.g., 'pr', 'de' -> 'PR', 'DE'
                    function_items[function_code].append(mapping.catalog_item_id)

        # Update catalog items with new framework-style metric IDs
        for function_code, item_ids in function_items.items():
            for idx, item_id in enumerate(item_ids, start=1):
                new_metric_id = f"{id_prefix}-{function_code}-{idx:03d}"
                catalog_item = db.query(MetricCatalogItem).filter(
                    MetricCatalogItem.id == item_id
                ).first()
                if catalog_item:
                    catalog_item.metric_id = new_metric_id

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
    db: Session = Depends(get_db),
    _editor: UserModel = Depends(require_editor),
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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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
    db: Session = Depends(get_db),
    _admin: UserModel = Depends(require_admin),
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

    # Use user's metric_id if available, otherwise generate synthetic number
    metric_number = item.metric_id if item.metric_id else f"C{str(item.id)[:8]}"

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

    # Get CSF function as lowercase string for API response
    csf_func = None
    if mapping and mapping.csf_function:
        csf_func_val = mapping.csf_function
        # Handle both enum and string values
        csf_func = csf_func_val.value if hasattr(csf_func_val, 'value') else str(csf_func_val).lower()

    metric_data = {
        "id": item.id,
        "metric_number": metric_number,
        "name": item.name,
        "description": item.description,
        "formula": item.formula,
        "calc_expr_json": None,
        "csf_function": csf_func,
        "csf_category_code": mapping.csf_category_code if mapping else None,
        "csf_subcategory_code": mapping.csf_subcategory_code if mapping else None,
        "csf_category_name": mapping.csf_category_name if mapping else None,
        "csf_subcategory_outcome": mapping.csf_subcategory_outcome if mapping else None,
        # AI RMF fields - not yet populated from catalog imports
        "ai_rmf_function": None,
        "ai_rmf_function_name": None,
        "ai_rmf_category_code": None,
        "ai_rmf_category_name": None,
        "ai_rmf_subcategory_code": None,
        "ai_rmf_subcategory_outcome": None,
        "trustworthiness_characteristic": None,
        # Framework FK IDs
        "framework_id": None,
        "function_id": mapping.function_id if mapping else None,
        "category_id": mapping.category_id if mapping else None,
        "subcategory_id": mapping.subcategory_id if mapping else None,
        # Core metric fields
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
        # Additional fields (populated during enhancement step)
        "risk_definition": item.risk_definition,
        "business_impact": item.business_impact,
        "active": True,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        # Lock fields
        "locked": False,
        "locked_by": None,
        "locked_at": None,
        # Calculated scores
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
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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
            # When filtering by function, join through FrameworkFunction to match by code
            # (csf_function is a Python property, not a DB column)
            func_code = function.value if hasattr(function, 'value') else str(function)
            logging.info(f"Filtering active catalog metrics by function: {func_code}")
            query = db.query(MetricCatalogItem, MetricCatalogCSFMapping).filter(
                MetricCatalogItem.catalog_id == active_catalog.id
            ).join(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            ).join(
                FrameworkFunction,
                MetricCatalogCSFMapping.function_id == FrameworkFunction.id
            ).filter(FrameworkFunction.code == func_code)
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
    current_user: UserModel = Depends(get_current_user),
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
            func_code = function.value if hasattr(function, 'value') else str(function)
            query = db.query(MetricCatalogItem, MetricCatalogCSFMapping).filter(
                MetricCatalogItem.catalog_id == active_catalog.id
            ).join(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            ).join(
                FrameworkFunction,
                MetricCatalogCSFMapping.function_id == FrameworkFunction.id
            ).filter(FrameworkFunction.code == func_code)
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
    
    # Build fieldnames dynamically from the first converted item to stay in sync
    # with convert_catalog_item_to_metric output
    if items:
        sample_data = convert_catalog_item_to_metric(items[0][0], items[0][1])
        fieldnames = list(sample_data.keys())
    else:
        fieldnames = ['id', 'metric_number', 'name', 'description']

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


@router.post("/clone-default", response_model=CatalogCloneResponse)
async def clone_default_catalog(
    request: CatalogCloneRequest,
    db: Session = Depends(get_db)
):
    """Clone the default system metrics into a new custom catalog.

    This creates a copy of all default metrics from the Metric table
    into a new MetricCatalog with MetricCatalogItems. Current values
    and audit history are cleared in the new catalog.
    """
    try:
        # Get the default framework (CSF 2.0) for the cloned catalog
        default_framework = db.query(Framework).filter(Framework.code == "csf_2_0").first()
        if not default_framework:
            raise HTTPException(status_code=500, detail="Default framework (CSF 2.0) not found")

        # Deactivate any existing active catalog for this owner
        db.query(MetricCatalog).filter(
            MetricCatalog.owner == request.owner,
            MetricCatalog.active == True
        ).update({"active": False})

        # Create new catalog
        new_catalog = MetricCatalog(
            name=request.new_name,
            description=request.description or "Cloned from default demo catalog - ready for customization",
            framework_id=default_framework.id,
            owner=request.owner,
            active=False,  # Start inactive, user can activate
            is_default=False,
            file_format="clone",
            original_filename="default-demo"
        )
        db.add(new_catalog)
        db.flush()  # Get the ID

        # Fetch all default metrics from the Metric table
        default_metrics = db.query(Metric).filter(Metric.active == True).all()

        items_cloned = 0
        mappings_cloned = 0

        for metric in default_metrics:
            # Create catalog item (without current_value if clear_current_values is True)
            catalog_item = MetricCatalogItem(
                catalog_id=new_catalog.id,
                metric_id=metric.metric_number,
                name=metric.name,
                description=metric.description,
                formula=metric.formula,
                direction=metric.direction,
                target_value=metric.target_value,
                target_units=metric.target_units,
                tolerance_low=metric.tolerance_low,
                tolerance_high=metric.tolerance_high,
                current_value=None if request.clear_current_values else metric.current_value,
                current_label=None if request.clear_current_values else metric.current_label,
                priority_rank=metric.priority_rank,
                weight=metric.weight,
                owner_function=metric.owner_function,
                data_source=metric.data_source,
                collection_frequency=metric.collection_frequency,
                risk_definition=metric.risk_definition,
                business_impact=metric.business_impact,
                import_notes=f"Cloned from default metric {metric.metric_number}"
            )
            db.add(catalog_item)
            db.flush()  # Get the item ID
            items_cloned += 1

            # Create framework mapping if the metric has function data
            if metric.function_id:
                fw_mapping = MetricCatalogCSFMapping(
                    catalog_id=new_catalog.id,
                    catalog_item_id=catalog_item.id,
                    function_id=metric.function_id,
                    category_id=metric.category_id,
                    subcategory_id=metric.subcategory_id,
                    confidence_score=1.0,
                    mapping_method=MappingMethod.AUTO,
                    mapping_notes="Copied from default catalog"
                )
                db.add(fw_mapping)
                mappings_cloned += 1

        db.commit()

        return CatalogCloneResponse(
            catalog_id=new_catalog.id,
            name=new_catalog.name,
            items_cloned=items_cloned,
            mappings_cloned=mappings_cloned,
            message=f"Successfully cloned {items_cloned} metrics from default catalog"
        )

    except SQLAlchemyError as e:
        db.rollback()
        logging.error(f"Database error cloning default catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logging.error(f"Error cloning default catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clone catalog: {str(e)}")


@router.post("/{catalog_id}/clone", response_model=CatalogCloneResponse)
async def clone_catalog(
    catalog_id: UUID,
    request: CatalogCloneRequest,
    db: Session = Depends(get_db)
):
    """Clone an existing custom catalog into a new catalog.

    Creates a deep copy of all items and mappings from the source catalog.
    Current values and audit history are optionally cleared in the new catalog.
    """
    # Find source catalog
    source_catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not source_catalog:
        raise HTTPException(status_code=404, detail="Source catalog not found")

    try:
        # Create new catalog
        new_catalog = MetricCatalog(
            name=request.new_name,
            description=request.description or f"Cloned from {source_catalog.name}",
            framework_id=source_catalog.framework_id,
            owner=request.owner,
            active=False,  # Start inactive
            is_default=False,
            file_format="clone",
            original_filename=source_catalog.name
        )
        db.add(new_catalog)
        db.flush()

        # Fetch all items from source catalog
        source_items = db.query(MetricCatalogItem).filter(
            MetricCatalogItem.catalog_id == catalog_id
        ).all()

        items_cloned = 0
        mappings_cloned = 0

        # Create a mapping from old item IDs to new item IDs
        item_id_map = {}

        for source_item in source_items:
            # Create new catalog item
            new_item = MetricCatalogItem(
                catalog_id=new_catalog.id,
                metric_id=source_item.metric_id,
                name=source_item.name,
                description=source_item.description,
                formula=source_item.formula,
                direction=source_item.direction,
                target_value=source_item.target_value,
                target_units=source_item.target_units,
                tolerance_low=source_item.tolerance_low,
                tolerance_high=source_item.tolerance_high,
                current_value=None if request.clear_current_values else source_item.current_value,
                current_label=None if request.clear_current_values else source_item.current_label,
                priority_rank=source_item.priority_rank,
                weight=source_item.weight,
                owner_function=source_item.owner_function,
                data_source=source_item.data_source,
                collection_frequency=source_item.collection_frequency,
                risk_definition=source_item.risk_definition,
                business_impact=source_item.business_impact,
                original_row_data=source_item.original_row_data,
                import_notes=f"Cloned from {source_catalog.name}"
            )
            db.add(new_item)
            db.flush()

            item_id_map[source_item.id] = new_item.id
            items_cloned += 1

        # Clone all mappings
        source_mappings = db.query(MetricCatalogCSFMapping).filter(
            MetricCatalogCSFMapping.catalog_id == catalog_id
        ).all()

        for source_mapping in source_mappings:
            new_item_id = item_id_map.get(source_mapping.catalog_item_id)
            if new_item_id:
                new_mapping = MetricCatalogCSFMapping(
                    catalog_id=new_catalog.id,
                    catalog_item_id=new_item_id,
                    function_id=source_mapping.function_id,
                    category_id=source_mapping.category_id,
                    subcategory_id=source_mapping.subcategory_id,
                    confidence_score=source_mapping.confidence_score,
                    mapping_method=source_mapping.mapping_method,
                    mapping_notes=f"Cloned from {source_catalog.name}"
                )
                db.add(new_mapping)
                mappings_cloned += 1

        db.commit()

        return CatalogCloneResponse(
            catalog_id=new_catalog.id,
            name=new_catalog.name,
            items_cloned=items_cloned,
            mappings_cloned=mappings_cloned,
            message=f"Successfully cloned {items_cloned} metrics from {source_catalog.name}"
        )

    except SQLAlchemyError as e:
        db.rollback()
        logging.error(f"Database error cloning catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        logging.error(f"Error cloning catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clone catalog: {str(e)}")