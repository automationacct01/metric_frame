"""Base provider abstraction for AI services.

Defines the abstract base class and common types used by all AI provider implementations.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Supported AI provider types."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    TOGETHER = "together"
    AZURE = "azure"
    BEDROCK = "bedrock"
    VERTEX = "vertex"
    LOCAL = "local"


class AuthType(str, Enum):
    """Authentication types for providers."""
    API_KEY = "api_key"
    AZURE = "azure"  # Azure AD or API key with endpoint
    AWS_IAM = "aws_iam"
    GCP = "gcp"  # Service account or ADC
    LOCAL_ENDPOINT = "local_endpoint"  # Base URL + optional API key


@dataclass
class ProviderCredentials:
    """Credentials container for different authentication methods.

    Different providers require different credential fields:
    - api_key: Anthropic, OpenAI, Together.ai
    - azure_*: Azure AI Foundry
    - aws_*: AWS Bedrock
    - gcp_*: GCP Vertex AI
    """
    # Common API key (Anthropic, OpenAI, Together)
    api_key: Optional[str] = None

    # Azure-specific
    azure_endpoint: Optional[str] = None
    azure_deployment: Optional[str] = None
    azure_api_version: Optional[str] = None

    # AWS-specific
    aws_access_key: Optional[str] = None
    aws_secret_key: Optional[str] = None
    aws_region: Optional[str] = None
    aws_session_token: Optional[str] = None  # For temporary credentials

    # GCP-specific
    gcp_project: Optional[str] = None
    gcp_location: Optional[str] = None
    gcp_credentials_json: Optional[str] = None  # Service account JSON

    # Local/OpenAI-compatible endpoint
    local_endpoint: Optional[str] = None  # e.g., http://localhost:11434/v1

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values."""
        return {k: v for k, v in self.__dict__.items() if v is not None}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProviderCredentials":
        """Create from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ModelInfo:
    """Information about an AI model."""
    model_id: str
    display_name: str
    description: Optional[str] = None
    context_window: Optional[int] = None
    max_output_tokens: Optional[int] = None
    supports_vision: bool = False
    supports_function_calling: bool = True


@dataclass
class AIResponse:
    """Unified response from any AI provider."""
    content: str
    model_used: str
    provider: ProviderType
    tokens_used: Dict[str, int] = field(default_factory=dict)  # {"input": X, "output": Y}
    latency_ms: float = 0.0
    finish_reason: Optional[str] = None
    raw_response: Optional[Any] = None


# ==============================================================================
# EXCEPTIONS
# ==============================================================================

class AIProviderError(Exception):
    """Base exception for AI provider errors."""
    retryable: bool = False
    provider: Optional[ProviderType] = None

    def __init__(self, message: str, provider: Optional[ProviderType] = None):
        super().__init__(message)
        self.provider = provider


class AuthenticationError(AIProviderError):
    """Invalid or expired credentials."""
    retryable = False


class RateLimitError(AIProviderError):
    """Rate limit exceeded."""
    retryable = True
    retry_after_seconds: Optional[int] = None

    def __init__(
        self,
        message: str,
        provider: Optional[ProviderType] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(message, provider)
        self.retry_after_seconds = retry_after


class ProviderTimeoutError(AIProviderError):
    """Request timed out."""
    retryable = True


class InvalidRequestError(AIProviderError):
    """Invalid request parameters."""
    retryable = False


class ServerError(AIProviderError):
    """Provider server error."""
    retryable = True


# ==============================================================================
# BASE PROVIDER
# ==============================================================================

class BaseAIProvider(ABC):
    """Abstract base class for all AI providers.

    Subclasses must implement all abstract methods to provide
    a consistent interface across different AI providers.
    """

    provider_type: ProviderType
    auth_type: AuthType
    supported_models: List[str] = []

    def __init__(self):
        self._credentials: Optional[ProviderCredentials] = None
        self._initialized: bool = False

    @abstractmethod
    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the provider with credentials.

        Args:
            credentials: Provider-specific credentials

        Returns:
            True if initialization succeeded, False otherwise
        """
        pass

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a response from the AI model.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            model: The model ID to use
            max_tokens: Maximum tokens in the response
            temperature: Sampling temperature (0.0 - 1.0)
            system_prompt: Optional system prompt
            **kwargs: Additional provider-specific parameters

        Returns:
            AIResponse with the generated content
        """
        pass

    @abstractmethod
    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate that credentials are working.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid, False otherwise
        """
        pass

    @abstractmethod
    def get_available_models(self) -> List[ModelInfo]:
        """Return list of available models with metadata.

        Returns:
            List of ModelInfo objects
        """
        pass

    def is_available(self) -> bool:
        """Check if provider is properly configured and available.

        Returns:
            True if the provider is ready to use
        """
        return self._initialized

    def get_default_model(self) -> Optional[str]:
        """Get the default model for this provider.

        Returns:
            The default model ID, or None if no models available
        """
        if self.supported_models:
            return self.supported_models[0]
        return None

    def supports_model(self, model_id: str) -> bool:
        """Check if a specific model is supported.

        Args:
            model_id: The model ID to check

        Returns:
            True if the model is supported
        """
        return model_id in self.supported_models
