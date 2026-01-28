"""Shared fixtures for AI chat router tests.

Provides:
- FastAPI TestClient with database dependency override
- Mock AI provider that returns controlled responses
- Pre-populated sample data fixtures (frameworks, metrics)
- Environment variable isolation for test runs
"""

import json
import os
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.db import get_db
from src.main import app
from src.services.ai.base_provider import (
    AIResponse as ProviderAIResponse,
    BaseAIProvider,
    ProviderCredentials,
    ProviderType,
)

from .fixtures.mock_responses import (
    EXPLAIN_MODE_RESPONSE,
    METRICS_MODE_CREATE_RESPONSE,
    REPORT_MODE_RESPONSE,
)
from .fixtures.sample_metrics import (
    create_sample_framework,
    create_sample_function_scores,
    create_sample_functions,
    create_sample_metrics,
)


# =============================================================================
# DATABASE FIXTURES
# =============================================================================

@pytest.fixture
def mock_db():
    """Create a mock database session with common query patterns.

    Returns a MagicMock that supports chained SQLAlchemy query calls
    (query, filter, first, all, limit, offset, etc.)
    """
    session = MagicMock()

    # Default query chains return empty results
    query_chain = MagicMock()
    query_chain.filter.return_value = query_chain
    query_chain.filter_by.return_value = query_chain
    query_chain.first.return_value = None
    query_chain.all.return_value = []
    query_chain.limit.return_value = query_chain
    query_chain.offset.return_value = query_chain
    query_chain.order_by.return_value = query_chain
    query_chain.count.return_value = 0
    session.query.return_value = query_chain

    session.add = MagicMock()
    session.commit = MagicMock()
    session.refresh = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()

    return session


@pytest.fixture
def client(mock_db):
    """Create a FastAPI TestClient with overridden database dependency.

    Uses the mock_db fixture to replace the real database session.
    Also clears AI-related environment variables to ensure isolated tests.
    """
    def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    # Clear env vars that affect provider resolution
    env_patches = {
        "AI_DEV_MODE": "",
        "ANTHROPIC_API_KEY": "",
        "OPENAI_API_KEY": "",
        "TOGETHER_API_KEY": "",
    }
    with patch.dict(os.environ, env_patches, clear=False):
        yield TestClient(app, raise_server_exceptions=False)

    # Clean up overrides
    app.dependency_overrides.pop(get_db, None)


# =============================================================================
# AI PROVIDER FIXTURES
# =============================================================================

@pytest.fixture
def mock_ai_response():
    """Create a default ProviderAIResponse for testing.

    Returns a realistic AI response that can be used as the default
    return value for the mock provider's generate_response method.
    """
    return ProviderAIResponse(
        content=METRICS_MODE_CREATE_RESPONSE,
        model_used="claude-sonnet-4-5-20250929",
        provider=ProviderType.ANTHROPIC,
        tokens_used={"input": 500, "output": 300},
        latency_ms=1200.0,
        finish_reason="end_turn",
    )


@pytest.fixture
def mock_provider(mock_ai_response):
    """Create a mock AI provider that returns controlled responses.

    The provider is pre-configured with a default response (metrics mode
    create response). Tests can override the response by setting:

        mock_provider.generate_response.return_value = ProviderAIResponse(
            content="custom response",
            model_used="test-model",
            provider=ProviderType.ANTHROPIC,
        )

    This fixture patches `get_active_provider` in the AI router module
    so that all endpoints use this mock provider instead of a real one.
    """
    provider = MagicMock(spec=BaseAIProvider)
    provider.provider_type = ProviderType.ANTHROPIC
    provider.generate_response = AsyncMock(return_value=mock_ai_response)
    provider.initialize = AsyncMock(return_value=True)
    provider.validate_credentials = AsyncMock(return_value=True)
    provider.is_available.return_value = True
    provider.get_default_model.return_value = "claude-sonnet-4-5-20250929"
    return provider


@pytest.fixture
def client_with_provider(mock_db, mock_provider):
    """Create a TestClient with both mock database and mock AI provider.

    This is the primary fixture for testing AI chat endpoints. It patches:
    1. The database dependency (get_db)
    2. The AI provider resolution (get_active_provider)

    Returns a tuple of (client, mock_provider) so tests can configure
    the provider response before making requests.
    """
    def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    env_patches = {
        "AI_DEV_MODE": "",
        "ANTHROPIC_API_KEY": "",
    }

    with patch.dict(os.environ, env_patches, clear=False), \
         patch("src.routers.ai.get_active_provider", return_value=mock_provider):
        client = TestClient(app, raise_server_exceptions=False)
        yield client, mock_provider, mock_db

    app.dependency_overrides.pop(get_db, None)


# =============================================================================
# SAMPLE DATA FIXTURES
# =============================================================================

@pytest.fixture
def sample_framework():
    """Pre-built CSF 2.0 framework object."""
    return create_sample_framework()


@pytest.fixture
def sample_functions(sample_framework):
    """Pre-built CSF 2.0 function objects linked to sample_framework."""
    return create_sample_functions(framework_id=sample_framework.id)


@pytest.fixture
def sample_metrics(sample_framework):
    """Pre-built metric objects across multiple CSF functions."""
    return create_sample_metrics(framework_id=sample_framework.id)


@pytest.fixture
def sample_function_scores():
    """Pre-built FunctionScore objects for all 6 CSF functions."""
    return create_sample_function_scores()
