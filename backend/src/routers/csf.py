"""NIST CSF 2.0 reference API endpoints."""

from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.csf_reference import csf_service


# Pydantic models for API responses
class CSFSubcategoryResponse(BaseModel):
    code: str
    outcome: str


class CSFCategoryResponse(BaseModel):
    code: str
    name: str
    description: str
    subcategories: List[CSFSubcategoryResponse]


class CSFFunctionResponse(BaseModel):
    code: str
    name: str
    description: str
    categories: List[CSFCategoryResponse]


class CSFHierarchyResponse(BaseModel):
    functions: List[CSFFunctionResponse]


class CSFValidationResponse(BaseModel):
    valid: bool
    message: Optional[str] = None


class CSFSuggestionResponse(BaseModel):
    category_code: str
    category_name: str
    confidence_score: float


router = APIRouter(prefix="/csf", tags=["NIST CSF 2.0 Reference"])


@router.get("/functions", response_model=List[CSFFunctionResponse])
async def list_functions():
    """List all NIST CSF 2.0 functions."""
    try:
        functions = csf_service.list_functions()
        return [
            CSFFunctionResponse(
                code=func.code,
                name=func.name,
                description=func.description,
                categories=[
                    CSFCategoryResponse(
                        code=cat.code,
                        name=cat.name,
                        description=cat.description,
                        subcategories=[
                            CSFSubcategoryResponse(
                                code=sub.code,
                                outcome=sub.outcome
                            )
                            for sub in cat.subcategories
                        ]
                    )
                    for cat in func.categories
                ]
            )
            for func in functions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/functions/{function_code}/categories", response_model=List[CSFCategoryResponse])
async def list_categories_for_function(function_code: str):
    """List categories for a specific CSF function."""
    try:
        categories = csf_service.list_categories(function_code=function_code)
        return [
            CSFCategoryResponse(
                code=cat.code,
                name=cat.name,
                description=cat.description,
                subcategories=[
                    CSFSubcategoryResponse(
                        code=sub.code,
                        outcome=sub.outcome
                    )
                    for sub in cat.subcategories
                ]
            )
            for cat in categories
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories/{category_code}/subcategories", response_model=List[CSFSubcategoryResponse])
async def list_subcategories_for_category(category_code: str):
    """List subcategories for a specific CSF category."""
    try:
        subcategories = csf_service.list_subcategories(category_code=category_code)
        return [
            CSFSubcategoryResponse(
                code=sub.code,
                outcome=sub.outcome
            )
            for sub in subcategories
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate/category/{category_code}", response_model=CSFValidationResponse)
async def validate_category_code(category_code: str):
    """Validate if a CSF category code exists."""
    try:
        is_valid = csf_service.validate_category_code(category_code)
        return CSFValidationResponse(
            valid=is_valid,
            message=f"Category code '{category_code}' is {'valid' if is_valid else 'invalid'}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate/subcategory/{subcategory_code}", response_model=CSFValidationResponse)
async def validate_subcategory_code(subcategory_code: str):
    """Validate if a CSF subcategory code exists."""
    try:
        is_valid = csf_service.validate_subcategory_code(subcategory_code)
        return CSFValidationResponse(
            valid=is_valid,
            message=f"Subcategory code '{subcategory_code}' is {'valid' if is_valid else 'invalid'}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate/pair/{category_code}/{subcategory_code}", response_model=CSFValidationResponse)
async def validate_category_subcategory_pair(category_code: str, subcategory_code: str):
    """Validate if category and subcategory codes form a valid pair."""
    try:
        is_valid = csf_service.validate_category_subcategory_pair(category_code, subcategory_code)
        return CSFValidationResponse(
            valid=is_valid,
            message=f"Category-Subcategory pair '{category_code}'-'{subcategory_code}' is {'valid' if is_valid else 'invalid'}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggest/category", response_model=List[CSFSuggestionResponse])
async def suggest_category_for_metric(metric_name: str, metric_description: str = ""):
    """Suggest appropriate CSF categories for a metric."""
    try:
        suggestions = csf_service.suggest_category_for_metric(metric_name, metric_description)
        return [
            CSFSuggestionResponse(
                category_code=code,
                category_name=name,
                confidence_score=score
            )
            for code, name, score in suggestions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hierarchy", response_model=Dict)
async def get_full_hierarchy():
    """Get the complete CSF hierarchy."""
    try:
        return csf_service.get_full_hierarchy()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/category/{category_code}")
async def get_category_info(category_code: str):
    """Get detailed information about a CSF category."""
    try:
        category = csf_service.get_category(category_code)
        if not category:
            raise HTTPException(status_code=404, detail=f"Category '{category_code}' not found")
        
        return CSFCategoryResponse(
            code=category.code,
            name=category.name,
            description=category.description,
            subcategories=[
                CSFSubcategoryResponse(
                    code=sub.code,
                    outcome=sub.outcome
                )
                for sub in category.subcategories
            ]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subcategory/{subcategory_code}")
async def get_subcategory_info(subcategory_code: str):
    """Get detailed information about a CSF subcategory."""
    try:
        subcategory = csf_service.get_subcategory(subcategory_code)
        if not subcategory:
            raise HTTPException(status_code=404, detail=f"Subcategory '{subcategory_code}' not found")
        
        return {
            "code": subcategory.code,
            "outcome": subcategory.outcome,
            "category_code": subcategory.category_code,
            "category_name": subcategory.category_name,
            "function_code": subcategory.function_code,
            "function_name": subcategory.function_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))