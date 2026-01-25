"""Tests for the AI provider factory."""
import pytest
from unittest.mock import patch, MagicMock

from src.services.ai.base_provider import ProviderType
from src.services.ai.provider_factory import (
    get_provider,
    get_available_providers,
    is_provider_available,
)
from src.services.ai.provider_registry import PROVIDER_REGISTRY


class TestGetProvider:
    """Tests for get_provider function."""

    def test_get_anthropic_provider(self):
        """Test getting Anthropic provider instance."""
        provider = get_provider(ProviderType.ANTHROPIC)
        assert provider is not None
        assert provider.provider_type == ProviderType.ANTHROPIC

    def test_get_openai_provider(self):
        """Test getting OpenAI provider instance."""
        provider = get_provider(ProviderType.OPENAI)
        assert provider is not None
        assert provider.provider_type == ProviderType.OPENAI

    def test_get_together_provider(self):
        """Test getting Together provider instance."""
        provider = get_provider(ProviderType.TOGETHER)
        assert provider is not None
        assert provider.provider_type == ProviderType.TOGETHER

    def test_get_azure_provider(self):
        """Test getting Azure provider instance."""
        provider = get_provider(ProviderType.AZURE)
        assert provider is not None
        assert provider.provider_type == ProviderType.AZURE

    def test_get_bedrock_provider(self):
        """Test getting Bedrock provider instance."""
        provider = get_provider(ProviderType.BEDROCK)
        assert provider is not None
        assert provider.provider_type == ProviderType.BEDROCK

    def test_get_vertex_provider(self):
        """Test getting Vertex provider instance."""
        provider = get_provider(ProviderType.VERTEX)
        assert provider is not None
        assert provider.provider_type == ProviderType.VERTEX

    def test_providers_are_instances(self):
        """Test that get_provider returns valid instances."""
        provider1 = get_provider(ProviderType.ANTHROPIC)
        provider2 = get_provider(ProviderType.ANTHROPIC)
        # Both should be valid provider instances
        assert provider1 is not None
        assert provider2 is not None
        assert provider1.provider_type == ProviderType.ANTHROPIC
        assert provider2.provider_type == ProviderType.ANTHROPIC


class TestGetAvailableProviders:
    """Tests for get_available_providers function."""

    def test_returns_list(self):
        """Test that function returns a list."""
        providers = get_available_providers()
        assert isinstance(providers, list)

    def test_providers_have_required_fields(self):
        """Test that each provider has required fields."""
        providers = get_available_providers()
        for provider in providers:
            assert "code" in provider
            assert "name" in provider
            assert "auth_type" in provider
            assert "auth_fields" in provider
            assert "models" in provider

    def test_all_provider_types_present(self):
        """Test that all provider types are represented."""
        providers = get_available_providers()
        codes = {p["code"] for p in providers}

        expected = {"anthropic", "openai", "together", "azure", "bedrock", "vertex"}
        assert expected == codes


class TestIsProviderAvailable:
    """Tests for is_provider_available function."""

    def test_anthropic_available(self):
        """Test Anthropic is always available (pure Python)."""
        assert is_provider_available(ProviderType.ANTHROPIC) is True

    def test_openai_available(self):
        """Test OpenAI is always available (pure Python)."""
        assert is_provider_available(ProviderType.OPENAI) is True

    def test_together_available(self):
        """Test Together is always available (pure Python)."""
        assert is_provider_available(ProviderType.TOGETHER) is True

    def test_azure_available(self):
        """Test Azure is always available (uses openai package)."""
        assert is_provider_available(ProviderType.AZURE) is True

    def test_bedrock_available(self):
        """Test Bedrock availability depends on boto3."""
        # boto3 should be installed in our environment
        result = is_provider_available(ProviderType.BEDROCK)
        assert isinstance(result, bool)

    def test_vertex_availability(self):
        """Test Vertex availability depends on google-genai."""
        # May or may not be available depending on installation
        result = is_provider_available(ProviderType.VERTEX)
        assert isinstance(result, bool)


class TestProviderRegistry:
    """Tests for the provider registry."""

    def test_registry_has_all_providers(self):
        """Test that registry contains all provider types."""
        for provider_type in ProviderType:
            assert provider_type in PROVIDER_REGISTRY

    def test_registry_provider_structure(self):
        """Test that each registry entry has correct structure."""
        for provider_type, info in PROVIDER_REGISTRY.items():
            assert "code" in info
            assert "name" in info
            assert "description" in info
            assert "auth_type" in info
            assert "auth_fields" in info
            assert "models" in info
            assert "default_model" in info

    def test_registry_models_have_required_fields(self):
        """Test that models in registry have required fields."""
        for provider_type, info in PROVIDER_REGISTRY.items():
            for model in info["models"]:
                assert hasattr(model, "model_id")
                assert hasattr(model, "display_name")
                assert hasattr(model, "context_window")

    def test_registry_auth_fields_structure(self):
        """Test that auth fields have correct structure."""
        for provider_type, info in PROVIDER_REGISTRY.items():
            for field in info["auth_fields"]:
                assert "name" in field
                assert "label" in field
                assert "type" in field
                assert "required" in field
