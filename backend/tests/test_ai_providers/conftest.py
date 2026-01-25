"""Fixtures for AI provider tests."""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from src.services.ai.base_provider import ProviderCredentials, AIResponse


@pytest.fixture
def sample_credentials():
    """Sample credentials for testing."""
    return ProviderCredentials(
        api_key="test-api-key-12345",
    )


@pytest.fixture
def azure_credentials():
    """Sample Azure credentials for testing."""
    return ProviderCredentials(
        api_key="test-azure-key",
        azure_endpoint="https://test.openai.azure.com",
        azure_deployment="gpt-4o",
        azure_api_version="2024-02-01",
    )


@pytest.fixture
def aws_credentials():
    """Sample AWS credentials for testing."""
    return ProviderCredentials(
        aws_access_key="AKIAIOSFODNN7EXAMPLE",
        aws_secret_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        aws_region="us-east-1",
    )


@pytest.fixture
def gcp_credentials():
    """Sample GCP credentials for testing."""
    return ProviderCredentials(
        gcp_project="test-project",
        gcp_location="us-central1",
        gcp_credentials_json='{"type": "service_account", "project_id": "test"}',
    )


@pytest.fixture
def sample_messages():
    """Sample chat messages for testing."""
    return [
        {"role": "user", "content": "Hello, how are you?"},
    ]


@pytest.fixture
def sample_ai_response():
    """Sample AI response for testing."""
    return AIResponse(
        content="I'm doing well, thank you for asking!",
        model="test-model",
        usage={
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30,
        },
        finish_reason="stop",
    )


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client."""
    with patch("src.services.ai.providers.anthropic_provider.Anthropic") as mock:
        client_instance = MagicMock()
        mock.return_value = client_instance

        # Mock the messages.create method
        response = MagicMock()
        response.content = [MagicMock(text="Test response")]
        response.model = "claude-sonnet-4-5-20250929"
        response.usage.input_tokens = 10
        response.usage.output_tokens = 20
        response.stop_reason = "end_turn"

        client_instance.messages.create = MagicMock(return_value=response)

        yield mock


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client."""
    with patch("src.services.ai.providers.openai_provider.OpenAI") as mock:
        client_instance = MagicMock()
        mock.return_value = client_instance

        # Mock the chat.completions.create method
        response = MagicMock()
        response.choices = [MagicMock(message=MagicMock(content="Test response"), finish_reason="stop")]
        response.model = "gpt-4o"
        response.usage.prompt_tokens = 10
        response.usage.completion_tokens = 20
        response.usage.total_tokens = 30

        client_instance.chat.completions.create = MagicMock(return_value=response)

        yield mock


@pytest.fixture
def mock_together_client():
    """Mock Together client."""
    with patch("src.services.ai.providers.together_provider.Together") as mock:
        client_instance = MagicMock()
        mock.return_value = client_instance

        # Mock the chat.completions.create method
        response = MagicMock()
        response.choices = [MagicMock(message=MagicMock(content="Test response"), finish_reason="stop")]
        response.model = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
        response.usage.prompt_tokens = 10
        response.usage.completion_tokens = 20
        response.usage.total_tokens = 30

        client_instance.chat.completions.create = MagicMock(return_value=response)

        yield mock
