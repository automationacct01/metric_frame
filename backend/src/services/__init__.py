# Services Package

# Legacy claude_client imports (backward compatibility)
from .claude_client import (
    ClaudeClient,
    claude_client,
    generate_csf_mapping_suggestions,
    generate_metric_enhancement_suggestions,
    generate_ai_response,
)

# New multi-provider AI system
from .ai import (
    BaseAIProvider,
    ProviderType,
    ProviderCredentials,
    AIResponse as ProviderAIResponse,
    AIProviderError,
    AuthenticationError,
    RateLimitError,
    ProviderTimeoutError,
    InvalidRequestError,
)
from .ai.provider_factory import (
    get_provider,
    get_available_providers,
    create_initialized_provider,
)

from .framework_reference import (
    FrameworkReferenceService,
    FrameworkInfo,
    FunctionInfo,
    CategoryInfo,
    SubcategoryInfo,
    get_framework_service,
)

from .scoring import (
    calculate_metric_score,
    calculate_function_scores,
    get_risk_rating,
    compute_framework_function_scores,
    compute_framework_category_scores,
    compute_framework_overall_score,
    get_framework_metrics_needing_attention,
    get_framework_coverage,
)

from .metric_recommendations import (
    generate_metric_recommendations,
    get_coverage_gaps,
    suggest_metrics_for_gap,
    get_metric_distribution,
)

from .csf_reference import (
    CSFReferenceService,
    csf_service,
)

__all__ = [
    # Claude client (legacy, backward compatibility)
    "ClaudeClient",
    "claude_client",
    "generate_csf_mapping_suggestions",
    "generate_metric_enhancement_suggestions",
    "generate_ai_response",
    # Multi-provider AI system
    "BaseAIProvider",
    "ProviderType",
    "ProviderCredentials",
    "ProviderAIResponse",
    "AIProviderError",
    "AuthenticationError",
    "RateLimitError",
    "ProviderTimeoutError",
    "InvalidRequestError",
    "get_provider",
    "get_available_providers",
    "create_initialized_provider",
    # Framework reference
    "FrameworkReferenceService",
    "FrameworkInfo",
    "FunctionInfo",
    "CategoryInfo",
    "SubcategoryInfo",
    "get_framework_service",
    # Scoring (legacy + multi-framework)
    "calculate_metric_score",
    "calculate_function_scores",
    "get_risk_rating",
    "compute_framework_function_scores",
    "compute_framework_category_scores",
    "compute_framework_overall_score",
    "get_framework_metrics_needing_attention",
    "get_framework_coverage",
    # Metric recommendations
    "generate_metric_recommendations",
    "get_coverage_gaps",
    "suggest_metrics_for_gap",
    "get_metric_distribution",
    # CSF reference (backward compatibility)
    "CSFReferenceService",
    "csf_service",
]
