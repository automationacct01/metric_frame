"""API endpoints for metric catalog management."""

import os
import tempfile
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..models import MetricCatalog, MetricCatalogItem, MetricCatalogCSFMapping, CSFFunction, MetricDirection, CollectionFrequency
from ..schemas import (
    MetricCatalogResponse,
    MetricCatalogCreate,
    CatalogImportRequest,
    CatalogImportResponse,
    CatalogMappingSuggestion,
    CatalogActivationRequest,
    MetricCatalogCSFMappingCreate,
    MetricCatalogCSFMappingResponse
)
from ..services.ai_client import generate_csf_mapping_suggestions

router = APIRouter(prefix="/catalogs", tags=["catalogs"])


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
    db: Session = Depends(get_db)
):
    """Upload and import a metric catalog file."""
    
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
        
        # Generate AI-powered CSF mapping suggestions
        suggested_mappings = []
        try:
            if items_imported > 0:
                suggestions = await generate_csf_mapping_suggestions(catalog.id, db)
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
    db: Session = Depends(get_db)
):
    """Get CSF mapping suggestions for a catalog."""
    catalog = db.query(MetricCatalog).filter(MetricCatalog.id == catalog_id).first()
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")
    
    try:
        suggestions = await generate_csf_mapping_suggestions(catalog_id, db)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate mappings: {str(e)}")


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
            mapping = MetricCatalogCSFMapping(
                catalog_id=catalog_id,
                **mapping_data.model_dump()
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