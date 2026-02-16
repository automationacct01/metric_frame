"""Provider factory for instantiating AI providers.

This module provides factory functions for creating provider instances
and managing provider availability.
"""
import logging
from typing import Dict, List, Optional, Type

from .base_provider import BaseAIProvider, ProviderType, ProviderCredentials
from .provider_registry import PROVIDER_REGISTRY, get_all_providers

logger = logging.getLogger(__name__)

# Registry of provider implementations
_provider_classes: Dict[ProviderType, Type[BaseAIProvider]] = {}


def register_provider(provider_type: ProviderType, provider_class: Type[BaseAIProvider]) -> None:
    """Register a provider implementation.

    Args:
        provider_type: The provider type to register
        provider_class: The provider class to use
    """
    _provider_classes[provider_type] = provider_class
    logger.info(f"Registered provider: {provider_type.value}")


def get_provider(provider_type: ProviderType) -> BaseAIProvider:
    """Get a new instance of a provider.

    Args:
        provider_type: The type of provider to create

    Returns:
        A new provider instance

    Raises:
        ValueError: If the provider type is not registered
    """
    if provider_type not in _provider_classes:
        raise ValueError(
            f"Provider '{provider_type.value}' is not registered. "
            f"Available providers: {list(_provider_classes.keys())}"
        )
    return _provider_classes[provider_type]()


def get_available_providers() -> List[Dict]:
    """Get list of available (registered) providers with metadata.

    Returns:
        List of provider info dicts for registered providers
    """
    available = []
    for provider_info in get_all_providers():
        provider_type = ProviderType(provider_info["provider_type"])
        if provider_type in _provider_classes:
            available.append({
                **provider_info,
                "available": True,
            })
        else:
            available.append({
                **provider_info,
                "available": False,
                "unavailable_reason": "Provider implementation not loaded",
            })
    return available


def is_provider_available(provider_type: ProviderType) -> bool:
    """Check if a provider implementation is available.

    Args:
        provider_type: The provider type to check

    Returns:
        True if the provider is registered and available
    """
    return provider_type in _provider_classes


async def create_initialized_provider(
    provider_type: ProviderType,
    credentials: ProviderCredentials
) -> Optional[BaseAIProvider]:
    """Create and initialize a provider with credentials.

    Args:
        provider_type: The type of provider to create
        credentials: The credentials to use

    Returns:
        An initialized provider instance, or None if initialization failed
    """
    try:
        provider = get_provider(provider_type)
        success = await provider.initialize(credentials)
        if success:
            return provider
        logger.warning(f"Failed to initialize provider {provider_type.value}")
        return None
    except Exception as e:
        logger.error(f"Error creating provider {provider_type.value}: {e}")
        return None


# Import and register provider implementations
# These imports are at the bottom to avoid circular imports
def _register_default_providers():
    """Register all default provider implementations."""
    try:
        from .providers.anthropic_provider import AnthropicProvider
        register_provider(ProviderType.ANTHROPIC, AnthropicProvider)
    except ImportError as e:
        logger.warning(f"Anthropic provider not available: {e}")

    try:
        from .providers.openai_provider import OpenAIProvider
        register_provider(ProviderType.OPENAI, OpenAIProvider)
    except ImportError as e:
        logger.debug(f"OpenAI provider not available: {e}")

    try:
        from .providers.together_provider import TogetherProvider
        register_provider(ProviderType.TOGETHER, TogetherProvider)
    except ImportError as e:
        logger.debug(f"Together provider not available: {e}")

    try:
        from .providers.azure_provider import AzureOpenAIProvider
        register_provider(ProviderType.AZURE, AzureOpenAIProvider)
    except ImportError as e:
        logger.debug(f"Azure provider not available: {e}")

    try:
        from .providers.bedrock_provider import BedrockProvider
        register_provider(ProviderType.BEDROCK, BedrockProvider)
    except ImportError as e:
        logger.debug(f"Bedrock provider not available: {e}")

    try:
        from .providers.vertex_provider import VertexAIProvider
        register_provider(ProviderType.VERTEX, VertexAIProvider)
    except ImportError as e:
        logger.debug(f"Vertex AI provider not available: {e}")

    try:
        from .providers.local_provider import LocalProvider
        register_provider(ProviderType.LOCAL, LocalProvider)
    except ImportError as e:
        logger.debug(f"Local provider not available: {e}")


# Auto-register providers on module load
_register_default_providers()
