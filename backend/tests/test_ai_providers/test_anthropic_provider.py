"""Tests for the Anthropic Claude provider."""
import pytest
from unittest.mock import patch, MagicMock

from src.services.ai.base_provider import ProviderType, ProviderCredentials
from src.services.ai.providers.anthropic_provider import AnthropicProvider


class TestAnthropicProvider:
    """Tests for AnthropicProvider class."""

    @pytest.fixture
    def provider(self):
        """Create an Anthropic provider instance."""
        return AnthropicProvider()

    @pytest.fixture
    def credentials(self):
        """Sample Anthropic credentials."""
        return ProviderCredentials(api_key="sk-ant-test-12345")

    def test_provider_type(self, provider):
        """Test provider type is correct."""
        assert provider.provider_type == ProviderType.ANTHROPIC

    def test_get_available_models(self, provider):
        """Test getting available models."""
        models = provider.get_available_models()
        assert len(models) > 0

        model_ids = [m.model_id for m in models]
        # Should have at least some Claude models
        assert any("claude" in m.lower() for m in model_ids)

    def test_get_default_model(self, provider):
        """Test getting default model."""
        default = provider.get_default_model()
        assert default is not None
        assert "claude" in default.lower()

    @pytest.mark.asyncio
    async def test_initialize_with_credentials(self, provider, credentials):
        """Test initializing provider with credentials."""
        with patch("src.services.ai.providers.anthropic_provider.Anthropic") as mock_client:
            await provider.initialize(credentials)
            mock_client.assert_called_once_with(api_key="sk-ant-test-12345")
            assert provider._initialized is True

    @pytest.mark.asyncio
    async def test_validate_credentials_success(self, provider, credentials):
        """Test validating correct credentials."""
        with patch("src.services.ai.providers.anthropic_provider.Anthropic") as mock_client:
            client_instance = MagicMock()
            mock_client.return_value = client_instance

            response = MagicMock()
            response.content = [MagicMock(text="Hello")]
            response.usage.input_tokens = 5
            response.usage.output_tokens = 5
            response.stop_reason = "end_turn"
            response.model = "claude-3-haiku-20240307"

            client_instance.messages.create.return_value = response

            result = await provider.validate_credentials(credentials)
            assert result is True
