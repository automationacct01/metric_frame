"""Tests for the OpenAI provider."""
import pytest
from unittest.mock import patch, MagicMock

from src.services.ai.base_provider import ProviderType, ProviderCredentials
from src.services.ai.providers.openai_provider import OpenAIProvider


class TestOpenAIProvider:
    """Tests for OpenAIProvider class."""

    @pytest.fixture
    def provider(self):
        """Create an OpenAI provider instance."""
        return OpenAIProvider()

    @pytest.fixture
    def credentials(self):
        """Sample OpenAI credentials."""
        return ProviderCredentials(api_key="sk-test-12345")

    def test_provider_type(self, provider):
        """Test provider type is correct."""
        assert provider.provider_type == ProviderType.OPENAI

    def test_get_available_models(self, provider):
        """Test getting available models."""
        models = provider.get_available_models()
        assert len(models) > 0

        model_ids = [m.model_id for m in models]
        assert "gpt-4o" in model_ids or any("gpt" in m.lower() for m in model_ids)

    def test_get_default_model(self, provider):
        """Test getting default model."""
        default = provider.get_default_model()
        assert default is not None

    @pytest.mark.asyncio
    async def test_initialize_with_credentials(self, provider, credentials):
        """Test initializing provider with credentials."""
        with patch("src.services.ai.providers.openai_provider.OpenAI") as mock_client:
            await provider.initialize(credentials)
            mock_client.assert_called_once_with(api_key="sk-test-12345")
            assert provider._initialized is True

    @pytest.mark.asyncio
    async def test_validate_credentials_success(self, provider, credentials):
        """Test validating correct credentials."""
        with patch("src.services.ai.providers.openai_provider.OpenAI") as mock_client:
            client_instance = MagicMock()
            mock_client.return_value = client_instance

            response = MagicMock()
            response.choices = [MagicMock(message=MagicMock(content="Hello"), finish_reason="stop")]
            response.model = "gpt-4o-mini"
            response.usage.prompt_tokens = 5
            response.usage.completion_tokens = 5
            response.usage.total_tokens = 10

            client_instance.chat.completions.create.return_value = response

            result = await provider.validate_credentials(credentials)
            assert result is True
