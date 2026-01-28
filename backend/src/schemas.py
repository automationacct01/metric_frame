"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict, field_validator
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


class AIRMFFunction(str, Enum):
    """NIST AI RMF 1.0 Core Functions."""
    GOVERN = "govern"
    MAP = "map"
    MEASURE = "measure"
    MANAGE = "manage"


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
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


# Base schemas
class MetricBase(BaseModel):
    """Base metric schema."""
    metric_number: Optional[str] = Field(None, max_length=20)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    formula: Optional[str] = None
    calc_expr_json: Optional[Dict[str, Any]] = None
    # NIST CSF 2.0 fields (computed from relationships)
    csf_function: Optional[CSFFunction] = None
    csf_category_code: Optional[str] = Field(None, max_length=30)
    csf_subcategory_code: Optional[str] = Field(None, max_length=40)
    csf_category_name: Optional[str] = Field(None, max_length=200)
    csf_subcategory_outcome: Optional[str] = None
    # NIST AI RMF 1.0 fields (computed from relationships)
    ai_rmf_function: Optional[AIRMFFunction] = None
    ai_rmf_function_name: Optional[str] = Field(None, max_length=50)
    ai_rmf_category_code: Optional[str] = Field(None, max_length=30)
    ai_rmf_category_name: Optional[str] = Field(None, max_length=200)
    ai_rmf_subcategory_code: Optional[str] = Field(None, max_length=40)
    ai_rmf_subcategory_outcome: Optional[str] = None
    trustworthiness_characteristic: Optional[str] = Field(None, max_length=100)
    # Multi-framework support (new fields)
    framework_id: Optional[UUID] = None
    function_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    # Priority and weighting
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
    risk_definition: Optional[str] = None  # Why this metric matters - business risk context
    active: bool = True


class MetricCreate(MetricBase):
    """Schema for creating a new metric."""
    pass


class MetricUpdate(BaseModel):
    """Schema for updating a metric (partial updates allowed)."""
    metric_number: Optional[str] = Field(None, max_length=20)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    formula: Optional[str] = None
    calc_expr_json: Optional[Dict[str, Any]] = None
    # NIST CSF 2.0 fields
    csf_function: Optional[CSFFunction] = None
    csf_category_code: Optional[str] = Field(None, max_length=30)
    csf_subcategory_code: Optional[str] = Field(None, max_length=40)
    csf_category_name: Optional[str] = Field(None, max_length=200)
    csf_subcategory_outcome: Optional[str] = None
    # NIST AI RMF 1.0 fields
    ai_rmf_function: Optional[AIRMFFunction] = None
    ai_rmf_function_name: Optional[str] = Field(None, max_length=50)
    ai_rmf_category_code: Optional[str] = Field(None, max_length=30)
    ai_rmf_category_name: Optional[str] = Field(None, max_length=200)
    ai_rmf_subcategory_code: Optional[str] = Field(None, max_length=40)
    ai_rmf_subcategory_outcome: Optional[str] = None
    trustworthiness_characteristic: Optional[str] = Field(None, max_length=100)
    framework_id: Optional[UUID] = None
    function_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
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
    risk_definition: Optional[str] = None
    active: Optional[bool] = None


class MetricResponse(MetricBase):
    """Schema for metric responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    last_collected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Lock fields
    locked: bool = False
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None

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


# Catalog schemas
class MetricCatalogBase(BaseModel):
    """Base metric catalog schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    owner: Optional[str] = Field(None, max_length=255)


class MetricCatalogCreate(MetricCatalogBase):
    """Schema for creating a new catalog."""
    pass


class MetricCatalogResponse(MetricCatalogBase):
    """Schema for catalog responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    active: bool = False
    is_default: bool = False
    file_format: Optional[str] = None
    original_filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items_count: Optional[int] = None


class MetricCatalogItemBase(BaseModel):
    """Base catalog item schema."""
    metric_id: str = Field(..., max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    formula: Optional[str] = None
    direction: MetricDirection
    target_value: Optional[float] = None
    target_units: Optional[str] = Field(None, max_length=50)
    tolerance_low: Optional[float] = None
    tolerance_high: Optional[float] = None
    priority_rank: int = Field(2, ge=1, le=3)
    weight: float = Field(1.0, ge=0.0, le=10.0)
    owner_function: Optional[str] = Field(None, max_length=100)
    data_source: Optional[str] = Field(None, max_length=200)
    collection_frequency: Optional[CollectionFrequency] = None
    current_value: Optional[float] = None
    current_label: Optional[str] = Field(None, max_length=100)


class MetricCatalogItemCreate(MetricCatalogItemBase):
    """Schema for creating catalog items."""
    original_row_data: Optional[Dict[str, Any]] = None
    import_notes: Optional[str] = None


class MetricCatalogItemResponse(MetricCatalogItemBase):
    """Schema for catalog item responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    catalog_id: UUID
    created_at: datetime
    updated_at: datetime


class MetricCatalogCSFMappingBase(BaseModel):
    """Base CSF mapping schema."""
    csf_function: CSFFunction
    csf_category_code: Optional[str] = Field(None, max_length=20)
    csf_subcategory_code: Optional[str] = Field(None, max_length=20)
    csf_category_name: Optional[str] = Field(None, max_length=120)
    csf_subcategory_outcome: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    mapping_method: Optional[str] = Field(None, max_length=50)
    mapping_notes: Optional[str] = None


class MetricCatalogCSFMappingCreate(MetricCatalogCSFMappingBase):
    """Schema for creating CSF mappings."""
    catalog_item_id: UUID


class MetricCatalogCSFMappingResponse(MetricCatalogCSFMappingBase):
    """Schema for CSF mapping responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    catalog_id: UUID
    catalog_item_id: UUID
    created_at: datetime
    updated_at: datetime


class CatalogImportRequest(BaseModel):
    """Schema for catalog import requests."""
    catalog_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    file_format: str = Field(..., pattern=r"^(csv|json)$")


class CatalogImportResponse(BaseModel):
    """Schema for catalog import responses."""
    catalog_id: UUID
    items_imported: int
    import_errors: List[str] = []
    suggested_mappings: List[Dict[str, Any]] = []


class CatalogMappingSuggestion(BaseModel):
    """Schema for CSF mapping suggestions."""
    catalog_item_id: UUID
    metric_name: str
    suggested_function: CSFFunction
    suggested_category: Optional[str] = None
    suggested_subcategory: Optional[str] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    reasoning: Optional[str] = None


class CatalogActivationRequest(BaseModel):
    """Schema for catalog activation."""
    activate: bool = True


# Health check schema
class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime
    database_connected: bool
    ai_service_available: bool


# ==============================================================================
# MULTI-FRAMEWORK SCHEMAS
# ==============================================================================

class FrameworkBase(BaseModel):
    """Base framework schema."""
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=255)
    version: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None


class FrameworkCreate(FrameworkBase):
    """Schema for creating a new framework."""
    active: bool = True
    metadata_: Optional[Dict[str, Any]] = Field(None, alias="metadata")


class FrameworkResponse(FrameworkBase):
    """Schema for framework responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    active: bool
    created_at: datetime


class FrameworkFunctionBase(BaseModel):
    """Base framework function schema."""
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    display_order: int = 0
    color_hex: Optional[str] = Field(None, max_length=7)
    icon_name: Optional[str] = Field(None, max_length=50)


class FrameworkFunctionResponse(FrameworkFunctionBase):
    """Schema for framework function responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    framework_id: UUID


class FrameworkCategoryBase(BaseModel):
    """Base framework category schema."""
    code: str = Field(..., min_length=1, max_length=30)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    display_order: int = 0


class FrameworkCategoryResponse(FrameworkCategoryBase):
    """Schema for framework category responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    function_id: UUID


class FrameworkSubcategoryBase(BaseModel):
    """Base framework subcategory schema."""
    code: str = Field(..., min_length=1, max_length=40)
    outcome: str
    display_order: int = 0


class FrameworkSubcategoryResponse(FrameworkSubcategoryBase):
    """Schema for framework subcategory responses."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID


class FrameworkHierarchyResponse(BaseModel):
    """Full framework hierarchy response."""
    framework: FrameworkResponse
    functions: List[Dict[str, Any]]  # Nested structure with categories and subcategories


class FrameworkFunctionScoreResponse(BaseModel):
    """Score for a framework function (multi-framework)."""
    function_code: str
    function_name: str
    function_description: Optional[str] = None
    color_hex: Optional[str] = None
    icon_name: Optional[str] = None
    score_pct: float = Field(..., ge=0.0, le=100.0)
    risk_rating: str
    metrics_count: int = Field(..., ge=0)
    metrics_with_data_count: int = Field(..., ge=0)
    metrics_below_target_count: int = Field(..., ge=0)
    weighted_score: float = Field(..., ge=0.0, le=1.0)


class FrameworkOverallScoreResponse(BaseModel):
    """Overall framework score response."""
    framework_code: str
    overall_score_pct: float = Field(..., ge=0.0, le=100.0)
    overall_risk_rating: str
    total_metrics_count: int = Field(..., ge=0)
    total_metrics_with_data_count: int = Field(..., ge=0)
    function_scores: List[FrameworkFunctionScoreResponse]


class FrameworkCoverageResponse(BaseModel):
    """Framework coverage statistics."""
    framework_code: str
    total_functions: int
    functions_with_metrics: int
    function_coverage_pct: float
    total_categories: int
    categories_with_metrics: int
    category_coverage_pct: float
    function_breakdown: List[Dict[str, Any]]


class MetricRecommendationRequest(BaseModel):
    """Request for AI metric recommendations."""
    framework_code: str = Field(..., min_length=1, max_length=20)
    max_recommendations: int = Field(10, ge=1, le=50)
    target_function: Optional[str] = None
    target_category: Optional[str] = None


class MetricRecommendationResponse(BaseModel):
    """Response with AI metric recommendations."""
    success: bool
    framework_code: str
    recommendations: List[Dict[str, Any]]
    gap_analysis: Dict[str, Any]
    current_coverage: Optional[Dict[str, Any]] = None
    current_overall_score: Optional[float] = None
    error: Optional[str] = None


class FrameworkListResponse(BaseModel):
    """List of available frameworks."""
    frameworks: List[FrameworkResponse]
    total: int


# ==============================================================================
# AI PROVIDER SCHEMAS
# ==============================================================================

class AuthType(str, Enum):
    """Authentication types for AI providers."""
    API_KEY = "api_key"
    AZURE = "azure"
    AWS_IAM = "aws_iam"
    GCP = "gcp"


class AuthFieldSchema(BaseModel):
    """Schema for authentication field definition."""
    name: str
    label: str
    type: str  # 'text', 'password', 'select', 'textarea'
    required: bool = True
    placeholder: Optional[str] = None
    default: Optional[str] = None
    options: Optional[List[str]] = None  # For select type


class AIModelSchema(BaseModel):
    """Schema for AI model info."""
    model_id: str
    display_name: str
    description: Optional[str] = None
    context_window: Optional[int] = None
    max_output_tokens: Optional[int] = None
    supports_vision: bool = False
    supports_function_calling: bool = True


class AIProviderSchema(BaseModel):
    """Schema for AI provider info."""
    code: str
    name: str
    description: Optional[str] = None
    auth_type: AuthType
    auth_fields: List[AuthFieldSchema]
    models: List[AIModelSchema]
    default_model: Optional[str] = None
    available: bool = True
    unavailable_reason: Optional[str] = None


class AIProviderListResponse(BaseModel):
    """Response with list of available AI providers."""
    providers: List[AIProviderSchema]
    total: int


class AIConfigurationCredentials(BaseModel):
    """Credentials for AI provider configuration (input only, never returned)."""
    api_key: Optional[str] = Field(None, max_length=500)
    # Azure-specific
    azure_endpoint: Optional[str] = Field(None, max_length=500)
    azure_deployment: Optional[str] = Field(None, max_length=200)
    azure_api_version: Optional[str] = Field(None, max_length=200)
    # AWS-specific
    aws_access_key: Optional[str] = Field(None, max_length=500)
    aws_secret_key: Optional[str] = Field(None, max_length=500)
    aws_region: Optional[str] = Field(None, max_length=50)
    # GCP-specific
    gcp_project: Optional[str] = Field(None, max_length=200)
    gcp_location: Optional[str] = Field(None, max_length=200)
    gcp_credentials_json: Optional[str] = Field(None, max_length=10000)

    @field_validator('gcp_credentials_json')
    @classmethod
    def validate_gcp_json(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            import json as json_module
            try:
                json_module.loads(v)
            except (json_module.JSONDecodeError, TypeError):
                raise ValueError("gcp_credentials_json must be valid JSON")
        return v


class AIConfigurationCreate(BaseModel):
    """Schema for creating a user AI configuration."""
    provider_code: str = Field(..., min_length=1, max_length=30)
    credentials: AIConfigurationCredentials
    model_id: Optional[str] = None
    max_tokens: int = Field(4096, ge=100, le=100000)
    temperature: float = Field(0.7, ge=0.0, le=2.0)


class AIConfigurationUpdate(BaseModel):
    """Schema for updating a user AI configuration."""
    credentials: Optional[AIConfigurationCredentials] = None
    model_id: Optional[str] = None
    max_tokens: Optional[int] = Field(None, ge=100, le=100000)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)


class AIConfigurationResponse(BaseModel):
    """Schema for AI configuration response (credentials redacted)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    provider_code: str
    provider_name: str
    is_active: bool
    model_id: Optional[str] = None
    max_tokens: int
    temperature: float
    credentials_validated: bool
    last_validated_at: Optional[datetime] = None
    validation_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AIConfigurationListResponse(BaseModel):
    """Response with list of user AI configurations."""
    configurations: List[AIConfigurationResponse]
    active_configuration_id: Optional[UUID] = None
    total: int


class AICredentialValidationResponse(BaseModel):
    """Response for credential validation."""
    valid: bool
    error: Optional[str] = None
    validated_at: datetime


class AIProviderStatusResponse(BaseModel):
    """AI provider status response."""
    provider_code: str
    provider_name: str
    available: bool
    configured: bool
    validated: bool
    is_active: bool
    model_id: Optional[str] = None
    last_validated_at: Optional[datetime] = None


# ==============================================================================
# DEMO MODE SCHEMAS
# ==============================================================================

class DemoSessionCreate(BaseModel):
    """Schema for creating a demo session."""
    email: str = Field(..., min_length=5, max_length=255)


class DemoSessionStart(BaseModel):
    """Schema for starting the demo (after video)."""
    video_skipped: bool = False


class DemoQuotas(BaseModel):
    """AI metric creation quotas for demo user."""
    csf_metrics_created: int = 0
    csf_metrics_max: int = 2
    ai_rmf_metrics_created: int = 0
    ai_rmf_metrics_max: int = 2

    @property
    def can_create_csf(self) -> bool:
        return self.csf_metrics_created < self.csf_metrics_max

    @property
    def can_create_ai_rmf(self) -> bool:
        return self.ai_rmf_metrics_created < self.ai_rmf_metrics_max


class DemoSessionResponse(BaseModel):
    """Response for demo session status."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: str
    email: str
    video_skipped: bool
    demo_started_at: Optional[datetime] = None
    demo_expires_at: Optional[datetime] = None
    expired: bool
    quotas: DemoQuotas
    created_at: datetime


class DemoMetricCreate(BaseModel):
    """Schema for creating a demo metric via AI."""
    metric_name: str = Field(..., min_length=3, max_length=255)
    framework: str = Field(..., pattern="^(csf_2_0|ai_rmf)$")
    # Optional: pass already-generated metric data to avoid re-generating
    metric_data: Optional[Dict[str, Any]] = None


class DemoMetricResponse(BaseModel):
    """Response for created demo metric."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    framework: str
    metric_data: Dict[str, Any]
    created_at: datetime


class DemoMetricsListResponse(BaseModel):
    """Response for demo metrics list."""
    items: List[MetricResponse]
    total: int
    framework: str
    is_demo: bool = True


# ==============================================================================
# DEMO GUIDED CHAT SCHEMAS
# ==============================================================================

class DemoStarterOption(BaseModel):
    """A pre-defined starter option for demo AI chat."""
    id: str
    label: str
    description: str
    icon: Optional[str] = None
    category: str  # CSF category or AI RMF category


class DemoRefinementOption(BaseModel):
    """A pre-defined refinement option for demo AI chat."""
    id: str
    label: str
    description: str


class DemoGuidedChatRequest(BaseModel):
    """Request for guided AI chat in demo mode.

    Only accepts pre-defined starter IDs, not free-form text.
    This prevents prompt injection and API abuse.
    """
    starter_id: str = Field(..., min_length=1, max_length=50)
    framework: str = Field("csf_2_0", pattern="^(csf_2_0|ai_rmf)$")
    refinement_id: Optional[str] = Field(None, max_length=50)
    refinement_value: Optional[str] = Field(None, max_length=100)  # For slider/dropdown values


class DemoGuidedChatResponse(BaseModel):
    """Response from guided AI chat in demo mode."""
    success: bool
    metric: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    interactions_used: int
    interactions_remaining: int
    chat_locked: bool = False
    upgrade_cta: bool = False  # True when limits nearly/fully exhausted


class DemoAIChatStatusResponse(BaseModel):
    """Status of demo AI chat capability."""
    can_use_chat: bool
    interactions_used: int
    interactions_remaining: int
    chat_locked: bool
    lock_reason: Optional[str] = None
    starters: List[DemoStarterOption]
    refinements: List[DemoRefinementOption]