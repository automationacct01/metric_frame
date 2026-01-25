"""Tests for the Together.ai provider."""
import pytest
from unittest.mock import patch, MagicMock

from src.services.ai.base_provider import ProviderType, ProviderCredentials
from src.services.ai.providers.together_provider import TogetherProvider


class TestTogetherProvider:
    """Tests for TogetherProvider class."""

    @pytest.fixture
    def provider(self):
        """Create a Together provider instance."""
        return TogetherProvider()

    @pytest.fixture
    def credentials(self):
        """Sample Together credentials."""
        return ProviderCredentials(api_key="together-test-12345")

    def test_provider_type(self, provider):
        """Test provider type is correct."""
        assert provider.provider_type == ProviderType.TOGETHER

    def test_get_available_models(self, provider):
        """Test getting available models."""
        models = provider.get_available_models()
        assert len(models) > 0

        model_ids = [m.model_id for m in models]
        assert any("llama" in m.lower() or "meta" in m.lower() for m in model_ids)

    def test_get_default_model(self, provider):
        """Test getting default model."""
        default = provider.get_default_model()
        assert default is not None

    @pytest.mark.asyncio
    async def test_initialize_with_credentials(self, provider, credentials):
        """Test initializing provider with credentials."""
        with patch("src.services.ai.providers.together_provider.Together") as mock_client:
            await provider.initialize(credentials)
            mock_client.assert_called_once_with(api_key="together-test-12345")
            assert provider._initialized is True

    @pytest.mark.asyncio
    async def test_validate_credentials_success(self, provider, credentials):
        """Test validating correct credentials."""
        with patch("src.services.ai.providers.together_provider.Together") as mock_client:
            client_instance = MagicMock()
            mock_client.return_value = client_instance

            response = MagicMock()
            response.choices = [MagicMock(message=MagicMock(content="Hello"), finish_reason="stop")]
            response.model = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
            response.usage.prompt_tokens = 5
            response.usage.completion_tokens = 5
            response.usage.total_tokens = 10

            client_instance.chat.completions.create.return_value = response

            result = await provider.validate_credentials(credentials)
            assert result is True
