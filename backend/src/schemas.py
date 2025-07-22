"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from enum import Enum


class CSFFunction(str, Enum):
    """NIST CSF 2.0 Core Functions."""
    GOVERN = "gv"
    IDENTIFY = "id" 
    PROTECT = "pr"
    DETECT = "de"
    RESPOND = "rs"
    RECOVER = "rc"


class MetricDirection(str, Enum):
    """Direction for metric scoring."""
    HIGHER_IS_BETTER = "higher_is_better"
    LOWER_IS_BETTER = "lower_is_better"
    TARGET_RANGE = "target_range"
    BINARY = "binary"


class CollectionFrequency(str, Enum):
    """How often metrics are collected."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    AD_HOC = "ad_hoc"


class RiskRating(str, Enum):
    """Risk rating levels."""
    LOW = "low"
    MODERATE = "moderate"
    ELEVATED = "elevated"
    HIGH = "high"


# Base schemas
class MetricBase(BaseModel):
    """Base metric schema."""
    metric_number: Optional[str] = Field(None, max_length=10)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    formula: Optional[str] = None
    calc_expr_json: Optional[Dict[str, Any]] = None
    csf_function: CSFFunction
    csf_category_code: Optional[str] = Field(None, max_length=20)
    csf_subcategory_code: Optional[str] = Field(None, max_length=20)
    csf_category_name: Optional[str] = Field(None, max_length=120)
    csf_subcategory_outcome: Optional[str] = None
    priority_rank: int = Field(2, ge=1, le=3)
    weight: float = Field(1.0, ge=0.0, le=10.0)
    direction: MetricDirection
    target_value: Optional[float] = None
    target_units: Optional[str] = Field(None, max_length=50)
    tolerance_low: Optional[float] = None
    tolerance_high: Optional[float] = None
    owner_function: Optional[str] = Field(None, max_length=100)
    data_source: Optional[str] = Field(None, max_length=200)
    collection_frequency: Optional[CollectionFrequency] = None
    current_value: Optional[float] = None
    current_label: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    active: bool = True


class MetricCreate(MetricBase):
    """Schema for creating a new metric."""
    pass


class MetricUpdate(BaseModel):
    """Schema for updating a metric (partial updates allowed)."""
    metric_number: Optional[str] = Field(None, max_length=10)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    formula: Optional[str] = None
    calc_expr_json: Optional[Dict[str, Any]] = None
    csf_function: Optional[CSFFunction] = None
    csf_category_code: Optional[str] = Field(None, max_length=20)
    csf_subcategory_code: Optional[str] = Field(None, max_length=20)
    csf_category_name: Optional[str] = Field(None, max_length=120)
    csf_subcategory_outcome: Optional[str] = None
    priority_rank: Optional[int] = Field(None, ge=1, le=3)
    weight: Optional[float] = Field(None, ge=0.0, le=10.0)
    direction: Optional[MetricDirection] = None
    target_value: Optional[float] = None
    target_units: Optional[str] = Field(None, max_length=50)
    tolerance_low: Optional[float] = None
    tolerance_high: Optional[float] = None
    owner_function: Optional[str] = Field(None, max_length=100)
    data_source: Optional[str] = Field(None, max_length=200)
    collection_frequency: Optional[CollectionFrequency] = None
    current_value: Optional[float] = None
    current_label: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    active: Optional[bool] = None


class MetricResponse(MetricBase):
    """Schema for metric responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    last_collected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    metric_score: Optional[float] = None
    gap_to_target: Optional[float] = None


# Metric history schemas
class MetricHistoryBase(BaseModel):
    """Base metric history schema."""
    collected_at: datetime
    raw_value_json: Optional[Dict[str, Any]] = None
    normalized_value: Optional[float] = None
    source_ref: Optional[str] = Field(None, max_length=200)


class MetricHistoryCreate(MetricHistoryBase):
    """Schema for creating metric history."""
    pass


class MetricHistoryResponse(MetricHistoryBase):
    """Schema for metric history responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    metric_id: UUID


# Scoring schemas
class CategoryScore(BaseModel):
    """Score for a CSF category."""
    category_code: str
    category_name: str
    category_description: Optional[str] = None
    score_pct: float = Field(..., ge=0.0, le=100.0)
    risk_rating: RiskRating
    metrics_count: int = Field(..., ge=0)
    metrics_below_target_count: int = Field(..., ge=0)
    weighted_score: float = Field(..., ge=0.0, le=1.0)


class CategoryDetailScore(CategoryScore):
    """Detailed category score with metrics breakdown."""
    metrics: List[Dict[str, Any]] = []


class CategoryScoresResponse(BaseModel):
    """Response for function category scores."""
    function_code: str
    function_name: str
    category_scores: List[CategoryScore]
    total_categories: int
    last_updated: datetime


class FunctionScore(BaseModel):
    """Score for a CSF function."""
    function: CSFFunction
    score_pct: float = Field(..., ge=0.0, le=100.0)
    risk_rating: RiskRating
    metrics_count: int = Field(..., ge=0)
    metrics_below_target_count: int = Field(..., ge=0)
    weighted_score: float = Field(..., ge=0.0, le=1.0)


class ScoresResponse(BaseModel):
    """Response for scores endpoint."""
    function_scores: List[FunctionScore]
    overall_score: float = Field(..., ge=0.0, le=100.0)
    overall_risk_rating: RiskRating
    last_updated: datetime


# AI Assistant schemas
class AIAction(BaseModel):
    """Individual AI action."""
    action: str = Field(..., pattern=r"^(add_metric|update_metric|delete_metric)$")
    metric: Optional[MetricCreate] = None
    metric_id: Optional[UUID] = None
    changes: Optional[Dict[str, Any]] = None


class AIResponse(BaseModel):
    """AI assistant response."""
    assistant_message: str
    actions: List[AIAction] = []
    needs_confirmation: bool = True


class AIChatRequest(BaseModel):
    """AI chat request."""
    message: str = Field(..., min_length=1, max_length=2000)
    mode: str = Field("metrics", pattern=r"^(metrics|explain|report)$")
    context_opts: Optional[Dict[str, Any]] = None


class AIApplyRequest(BaseModel):
    """Request to apply AI actions."""
    actions: List[AIAction]
    user_confirmation: bool = True


# AI Change Log schemas
class AIChangeLogResponse(BaseModel):
    """AI change log response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    metric_id: Optional[UUID] = None
    user_prompt: str
    ai_response_json: Dict[str, Any]
    applied: bool
    applied_by: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: datetime


# Filter and query schemas
class MetricFilters(BaseModel):
    """Filters for metric queries."""
    function: Optional[CSFFunction] = None
    category_code: Optional[str] = Field(None, max_length=20)
    subcategory_code: Optional[str] = Field(None, max_length=20)
    priority_rank: Optional[int] = Field(None, ge=1, le=3)
    active: Optional[bool] = None
    search: Optional[str] = Field(None, max_length=255)
    owner_function: Optional[str] = Field(None, max_length=100)
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)


class MetricListResponse(BaseModel):
    """Paginated metric list response."""
    items: List[MetricResponse]
    total: int
    limit: int
    offset: int
    has_more: bool


# Health check schema
class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime
    database_connected: bool
    ai_service_available: bool