"""Tests for the base AI provider abstraction."""
import pytest
from dataclasses import asdict

from src.services.ai.base_provider import (
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


class TestProviderType:
    """Tests for ProviderType enum."""

    def test_provider_type_values(self):
        """Test that all provider types have correct values."""
        assert ProviderType.ANTHROPIC.value == "anthropic"
        assert ProviderType.OPENAI.value == "openai"
        assert ProviderType.TOGETHER.value == "together"
        assert ProviderType.AZURE.value == "azure"
        assert ProviderType.BEDROCK.value == "bedrock"
        assert ProviderType.VERTEX.value == "vertex"

    def test_provider_type_from_string(self):
        """Test creating ProviderType from string."""
        assert ProviderType("anthropic") == ProviderType.ANTHROPIC
        assert ProviderType("openai") == ProviderType.OPENAI

    def test_invalid_provider_type(self):
        """Test that invalid provider type raises ValueError."""
        with pytest.raises(ValueError):
            ProviderType("invalid_provider")


class TestProviderCredentials:
    """Tests for ProviderCredentials dataclass."""

    def test_api_key_only(self):
        """Test credentials with just API key."""
        creds = ProviderCredentials(api_key="test-key")
        assert creds.api_key == "test-key"
        assert creds.azure_endpoint is None
        assert creds.aws_access_key is None

    def test_azure_credentials(self):
        """Test Azure-specific credentials."""
        creds = ProviderCredentials(
            api_key="azure-key",
            azure_endpoint="https://test.openai.azure.com",
            azure_deployment="gpt-4o",
            azure_api_version="2024-02-01",
        )
        assert creds.azure_endpoint == "https://test.openai.azure.com"
        assert creds.azure_deployment == "gpt-4o"

    def test_aws_credentials(self):
        """Test AWS-specific credentials."""
        creds = ProviderCredentials(
            aws_access_key="AKIATEST",
            aws_secret_key="secret123",
            aws_region="us-east-1",
        )
        assert creds.aws_access_key == "AKIATEST"
        assert creds.aws_region == "us-east-1"

    def test_gcp_credentials(self):
        """Test GCP-specific credentials."""
        creds = ProviderCredentials(
            gcp_project="my-project",
            gcp_location="us-central1",
            gcp_credentials_json='{"type": "service_account"}',
        )
        assert creds.gcp_project == "my-project"
        assert creds.gcp_location == "us-central1"

    def test_credentials_to_dict(self):
        """Test converting credentials to dictionary."""
        creds = ProviderCredentials(api_key="test-key")
        creds_dict = asdict(creds)
        assert creds_dict["api_key"] == "test-key"
        assert creds_dict["azure_endpoint"] is None


class TestAIResponse:
    """Tests for AIResponse dataclass."""

    def test_basic_response(self):
        """Test basic AI response."""
        response = AIResponse(
            content="Hello, world!",
            model_used="test-model",
            provider=ProviderType.ANTHROPIC,
            tokens_used={"input": 5, "output": 3},
            finish_reason="stop",
        )
        assert response.content == "Hello, world!"
        assert response.model_used == "test-model"
        assert response.finish_reason == "stop"

    def test_response_with_raw_response(self):
        """Test AI response with raw response data."""
        raw = {"id": "test-123", "object": "chat.completion"}
        response = AIResponse(
            content="Test",
            model_used="model",
            provider=ProviderType.OPENAI,
            tokens_used={},
            finish_reason="stop",
            raw_response=raw,
        )
        assert response.raw_response == raw


class TestAIProviderErrors:
    """Tests for AI provider error classes."""

    def test_base_error(self):
        """Test base AIProviderError."""
        error = AIProviderError("Something went wrong")
        assert str(error) == "Something went wrong"

    def test_authentication_error(self):
        """Test AuthenticationError."""
        error = AuthenticationError("Invalid API key")
        assert isinstance(error, AIProviderError)
        assert str(error) == "Invalid API key"

    def test_rate_limit_error(self):
        """Test RateLimitError with retry_after."""
        error = RateLimitError("Rate limited", retry_after=30)
        assert error.retry_after_seconds == 30

    def test_timeout_error(self):
        """Test ProviderTimeoutError."""
        error = ProviderTimeoutError("Request timed out")
        assert isinstance(error, AIProviderError)

    def test_invalid_request_error(self):
        """Test InvalidRequestError."""
        error = InvalidRequestError("Invalid model specified")
        assert isinstance(error, AIProviderError)
