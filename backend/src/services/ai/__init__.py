"""AI services package for multi-provider support.

This package provides a unified interface for interacting with multiple AI providers:
- Anthropic Claude
- OpenAI GPT
- Together.ai (Llama, Mistral, etc.)
- Azure OpenAI
- AWS Bedrock
- GCP Vertex AI

Usage:
    from src.services.ai import get_provider, ProviderType

    # Get a provider instance
    provider = get_provider(ProviderType.ANTHROPIC)

    # Initialize with credentials
    await provider.initialize(credentials)

    # Generate a response
    response = await provider.generate_response(
        messages=[{"role": "user", "content": "Hello"}],
        model="claude-sonnet-4-5-20250929"
    )
"""
from .base_provider import (
    BaseAIProvider,
    ProviderType,
    ProviderCredentials,
    AIResponse,
    AIProviderError,
    AuthenticationError,
    RateLimitError,
    ProviderTimeoutError,
    InvalidRequestError,
)
from .provider_factory import get_provider, get_available_providers, is_provider_available, create_initialized_provider
from .provider_registry import PROVIDER_REGISTRY

__all__ = [
    # Base classes
    "BaseAIProvider",
    "ProviderType",
    "ProviderCredentials",
    "AIResponse",
    # Errors
    "AIProviderError",
    "AuthenticationError",
    "RateLimitError",
    "ProviderTimeoutError",
    "InvalidRequestError",
    # Factory functions
    "get_provider",
    "get_available_providers",
    "is_provider_available",
    "create_initialized_provider",
    # Registry
    "PROVIDER_REGISTRY",
]
