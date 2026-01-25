"""Tests for the AWS Bedrock provider."""
import pytest
from unittest.mock import patch, MagicMock
import json

from src.services.ai.base_provider import ProviderType, ProviderCredentials
from src.services.ai.providers.bedrock_provider import BedrockProvider


class TestBedrockProvider:
    """Tests for BedrockProvider class."""

    @pytest.fixture
    def provider(self):
        """Create a Bedrock provider instance."""
        return BedrockProvider()

    @pytest.fixture
    def credentials(self):
        """Sample AWS credentials."""
        return ProviderCredentials(
            aws_access_key="AKIAIOSFODNN7EXAMPLE",
            aws_secret_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            aws_region="us-east-1",
        )

    def test_provider_type(self, provider):
        """Test provider type is correct."""
        assert provider.provider_type == ProviderType.BEDROCK

    def test_is_available(self, provider):
        """Test Bedrock availability (depends on boto3)."""
        result = provider.is_available()
        assert isinstance(result, bool)

    def test_get_available_models(self, provider):
        """Test getting available models."""
        models = provider.get_available_models()
        assert len(models) > 0

        model_ids = [m.model_id for m in models]
        # Should have Claude and/or Llama models
        assert any("claude" in m.lower() or "llama" in m.lower() or "titan" in m.lower() for m in model_ids)

    def test_get_default_model(self, provider):
        """Test getting default model."""
        default = provider.get_default_model()
        assert default is not None

    @pytest.mark.asyncio
    async def test_validate_credentials_success(self, provider, credentials):
        """Test validating correct credentials."""
        with patch("src.services.ai.providers.bedrock_provider.boto3") as mock_boto:
            mock_client = MagicMock()
            mock_boto.client.return_value = mock_client

            # Mock Bedrock response for Claude
            response_body = json.dumps({
                "content": [{"text": "Hello"}],
                "usage": {"input_tokens": 5, "output_tokens": 5},
                "stop_reason": "end_turn",
            })
            mock_client.invoke_model.return_value = {
                "body": MagicMock(read=MagicMock(return_value=response_body.encode()))
            }

            result = await provider.validate_credentials(credentials)
            assert result is True
