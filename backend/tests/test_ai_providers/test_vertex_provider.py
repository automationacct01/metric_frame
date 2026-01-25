"""Tests for the GCP Vertex AI provider."""
import pytest

from src.services.ai.base_provider import ProviderType, ProviderCredentials
from src.services.ai.providers.vertex_provider import VertexAIProvider


class TestVertexAIProvider:
    """Tests for VertexAIProvider class."""

    @pytest.fixture
    def provider(self):
        """Create a Vertex AI provider instance."""
        return VertexAIProvider()

    @pytest.fixture
    def credentials(self):
        """Sample GCP credentials."""
        return ProviderCredentials(
            gcp_project="my-gcp-project",
            gcp_location="us-central1",
            gcp_credentials_json='{"type": "service_account", "project_id": "my-gcp-project"}',
        )

    def test_provider_type(self, provider):
        """Test provider type is correct."""
        assert provider.provider_type == ProviderType.VERTEX

    def test_is_available(self, provider):
        """Test Vertex availability (depends on google-genai)."""
        result = provider.is_available()
        assert isinstance(result, bool)

    def test_get_available_models(self, provider):
        """Test getting available models."""
        models = provider.get_available_models()
        assert len(models) > 0

        model_ids = [m.model_id for m in models]
        # Should have Gemini models
        assert any("gemini" in m.lower() for m in model_ids)

    def test_get_default_model(self, provider):
        """Test getting default model."""
        default = provider.get_default_model()
        assert "gemini" in default.lower()
