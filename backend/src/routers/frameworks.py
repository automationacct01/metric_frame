"""Frameworks API router.

Provides endpoints for managing NIST frameworks including:
- CSF 2.0 (with Cyber AI Profile integration)
- AI RMF 1.0

API Endpoints:
- GET /frameworks - List all available frameworks
- GET /frameworks/{code} - Get framework details
- GET /frameworks/{code}/functions - Get framework functions
- GET /frameworks/{code}/categories - Get framework categories
- GET /frameworks/{code}/subcategories - Get framework subcategories
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    FrameworkSubcategory,
)


router = APIRouter(prefix="/frameworks", tags=["frameworks"])


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class SubcategoryResponse(BaseModel):
    """Response schema for subcategory."""
    id: UUID
    code: str
    outcome: str
    display_order: int
    ai_profile_focus: Optional[str] = None
    trustworthiness_characteristic: Optional[str] = None

    class Config:
        from_attributes = True


class CategoryResponse(BaseModel):
    """Response schema for category."""
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    display_order: int
    subcategories: List[SubcategoryResponse] = []

    class Config:
        from_attributes = True


class FunctionResponse(BaseModel):
    """Response schema for function."""
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    display_order: int
    color_hex: Optional[str] = None
    icon_name: Optional[str] = None
    categories: List[CategoryResponse] = []

    class Config:
        from_attributes = True


class FrameworkResponse(BaseModel):
    """Response schema for framework."""
    id: UUID
    code: str
    name: str
    version: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    active: bool = True
    is_extension: bool = False

    class Config:
        from_attributes = True


class FrameworkDetailResponse(FrameworkResponse):
    """Detailed response schema for framework with functions."""
    functions: List[FunctionResponse] = []


class FrameworkStatsResponse(BaseModel):
    """Response schema for framework statistics."""
    framework_code: str
    functions_count: int
    categories_count: int
    subcategories_count: int
    metrics_count: int


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@router.get("", response_model=List[FrameworkResponse])
def list_frameworks(
    active_only: bool = Query(True, description="Only return active frameworks"),
    db: Session = Depends(get_db),
):
    """List all available frameworks.

    Returns a list of frameworks with basic information.
    Use the detail endpoint for full hierarchy.
    """
    query = db.query(Framework)
    if active_only:
        query = query.filter(Framework.active == True)
    frameworks = query.order_by(Framework.code).all()
    return frameworks


@router.get("/{code}", response_model=FrameworkDetailResponse)
def get_framework(
    code: str,
    include_hierarchy: bool = Query(True, description="Include full hierarchy"),
    db: Session = Depends(get_db),
):
    """Get framework details by code.

    Args:
        code: Framework code (e.g., 'csf_2_0', 'ai_rmf')
        include_hierarchy: If True, includes functions, categories, and subcategories

    Returns:
        Framework details with optional hierarchy
    """
    framework = db.query(Framework).filter(Framework.code == code).first()
    if not framework:
        raise HTTPException(status_code=404, detail=f"Framework '{code}' not found")

    if include_hierarchy:
        # Eager load the hierarchy
        functions = db.query(FrameworkFunction).filter(
            FrameworkFunction.framework_id == framework.id
        ).order_by(FrameworkFunction.display_order).all()

        functions_with_categories = []
        for func in functions:
            categories = db.query(FrameworkCategory).filter(
                FrameworkCategory.function_id == func.id
            ).order_by(FrameworkCategory.display_order).all()

            categories_with_subcats = []
            for cat in categories:
                subcategories = db.query(FrameworkSubcategory).filter(
                    FrameworkSubcategory.category_id == cat.id
                ).order_by(FrameworkSubcategory.display_order).all()

                cat_response = CategoryResponse(
                    id=cat.id,
                    code=cat.code,
                    name=cat.name,
                    description=cat.description,
                    display_order=cat.display_order,
                    subcategories=[SubcategoryResponse.model_validate(s) for s in subcategories],
                )
                categories_with_subcats.append(cat_response)

            func_response = FunctionResponse(
                id=func.id,
                code=func.code,
                name=func.name,
                description=func.description,
                display_order=func.display_order,
                color_hex=func.color_hex,
                icon_name=func.icon_name,
                categories=categories_with_subcats,
            )
            functions_with_categories.append(func_response)

        return FrameworkDetailResponse(
            id=framework.id,
            code=framework.code,
            name=framework.name,
            version=framework.version,
            description=framework.description,
            source_url=framework.source_url,
            active=framework.active,
            is_extension=framework.is_extension,
            functions=functions_with_categories,
        )

    return FrameworkDetailResponse.model_validate(framework)


@router.get("/{code}/functions", response_model=List[FunctionResponse])
def get_framework_functions(
    code: str,
    include_categories: bool = Query(False, description="Include categories"),
    db: Session = Depends(get_db),
):
    """Get functions for a specific framework.

    Args:
        code: Framework code
        include_categories: If True, includes categories for each function

    Returns:
        List of framework functions
    """
    framework = db.query(Framework).filter(Framework.code == code).first()
    if not framework:
        raise HTTPException(status_code=404, detail=f"Framework '{code}' not found")

    functions = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).order_by(FrameworkFunction.display_order).all()

    if include_categories:
        result = []
        for func in functions:
            categories = db.query(FrameworkCategory).filter(
                FrameworkCategory.function_id == func.id
            ).order_by(FrameworkCategory.display_order).all()

            func_response = FunctionResponse(
                id=func.id,
                code=func.code,
                name=func.name,
                description=func.description,
                display_order=func.display_order,
                color_hex=func.color_hex,
                icon_name=func.icon_name,
                categories=[CategoryResponse.model_validate(c) for c in categories],
            )
            result.append(func_response)
        return result

    return [FunctionResponse.model_validate(f) for f in functions]


@router.get("/{code}/categories", response_model=List[CategoryResponse])
def get_framework_categories(
    code: str,
    function_code: Optional[str] = Query(None, description="Filter by function code"),
    include_subcategories: bool = Query(False, description="Include subcategories"),
    db: Session = Depends(get_db),
):
    """Get categories for a specific framework.

    Args:
        code: Framework code
        function_code: Optional filter by function code
        include_subcategories: If True, includes subcategories for each category

    Returns:
        List of framework categories
    """
    framework = db.query(Framework).filter(Framework.code == code).first()
    if not framework:
        raise HTTPException(status_code=404, detail=f"Framework '{code}' not found")

    query = db.query(FrameworkCategory).join(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    )

    if function_code:
        query = query.filter(FrameworkFunction.code == function_code.lower())

    categories = query.order_by(
        FrameworkFunction.display_order,
        FrameworkCategory.display_order
    ).all()

    if include_subcategories:
        result = []
        for cat in categories:
            subcategories = db.query(FrameworkSubcategory).filter(
                FrameworkSubcategory.category_id == cat.id
            ).order_by(FrameworkSubcategory.display_order).all()

            cat_response = CategoryResponse(
                id=cat.id,
                code=cat.code,
                name=cat.name,
                description=cat.description,
                display_order=cat.display_order,
                subcategories=[SubcategoryResponse.model_validate(s) for s in subcategories],
            )
            result.append(cat_response)
        return result

    return [CategoryResponse.model_validate(c) for c in categories]


@router.get("/{code}/subcategories", response_model=List[SubcategoryResponse])
def get_framework_subcategories(
    code: str,
    category_code: Optional[str] = Query(None, description="Filter by category code"),
    ai_profile_focus: Optional[str] = Query(None, description="Filter by AI profile focus"),
    trustworthiness: Optional[str] = Query(None, description="Filter by trustworthiness characteristic"),
    db: Session = Depends(get_db),
):
    """Get subcategories for a specific framework.

    Args:
        code: Framework code
        category_code: Optional filter by category code
        ai_profile_focus: Optional filter by AI profile focus (secure, defend, thwart)
        trustworthiness: Optional filter by AI RMF trustworthiness characteristic

    Returns:
        List of framework subcategories
    """
    framework = db.query(Framework).filter(Framework.code == code).first()
    if not framework:
        raise HTTPException(status_code=404, detail=f"Framework '{code}' not found")

    query = db.query(FrameworkSubcategory).join(FrameworkCategory).join(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    )

    if category_code:
        query = query.filter(FrameworkCategory.code == category_code)

    if ai_profile_focus:
        query = query.filter(FrameworkSubcategory.ai_profile_focus == ai_profile_focus)

    if trustworthiness:
        query = query.filter(FrameworkSubcategory.trustworthiness_characteristic == trustworthiness)

    subcategories = query.order_by(
        FrameworkFunction.display_order,
        FrameworkCategory.display_order,
        FrameworkSubcategory.display_order
    ).all()

    return [SubcategoryResponse.model_validate(s) for s in subcategories]


@router.get("/{code}/stats", response_model=FrameworkStatsResponse)
def get_framework_stats(
    code: str,
    db: Session = Depends(get_db),
):
    """Get statistics for a specific framework.

    Returns counts of functions, categories, subcategories, and metrics.
    """
    from ..models import Metric

    framework = db.query(Framework).filter(Framework.code == code).first()
    if not framework:
        raise HTTPException(status_code=404, detail=f"Framework '{code}' not found")

    functions_count = db.query(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).count()

    categories_count = db.query(FrameworkCategory).join(FrameworkFunction).filter(
        FrameworkFunction.framework_id == framework.id
    ).count()

    subcategories_count = db.query(FrameworkSubcategory).join(FrameworkCategory).join(
        FrameworkFunction
    ).filter(
        FrameworkFunction.framework_id == framework.id
    ).count()

    metrics_count = db.query(Metric).filter(
        Metric.framework_id == framework.id
    ).count()

    return FrameworkStatsResponse(
        framework_code=framework.code,
        functions_count=functions_count,
        categories_count=categories_count,
        subcategories_count=subcategories_count,
        metrics_count=metrics_count,
    )
