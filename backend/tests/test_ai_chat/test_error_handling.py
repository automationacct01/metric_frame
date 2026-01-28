"""Tests for AI chat error handling and edge cases.

Validates proper error responses for:
- Missing or unavailable AI providers
- Provider API errors and exceptions
- Invalid framework codes
- Empty or missing message fields
- Framework-specific system prompts
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from src.routers.ai import get_system_prompt_for_mode
from src.services.ai.base_provider import (
    AIProviderError,
    AIResponse as ProviderAIResponse,
    AuthenticationError,
    ProviderType,
    RateLimitError,
)


# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

class TestErrorHandling:
    """Tests for error scenarios in the AI chat endpoints."""

    def test_no_provider_configured(self, client):
        """When no AI provider is available, the endpoint should return 403."""
        # The client fixture already clears env vars, so get_active_provider
        # will raise HTTPException(403).

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric for patching compliance",
                "mode": "metrics",
            },
        )

        assert response.status_code in (403, 503)
        data = response.json()
        assert "detail" in data

    def test_provider_api_error(self, client_with_provider):
        """When the AI provider raises an error, a 503 should be returned."""
        client, provider, db = client_with_provider

        # Make the provider raise an AIProviderError
        provider.generate_response.side_effect = AIProviderError(
            "Service temporarily unavailable",
            provider=ProviderType.ANTHROPIC,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric",
                "mode": "metrics",
            },
        )

        assert response.status_code == 503
        data = response.json()
        assert "provider error" in data["detail"].lower()

    def test_provider_authentication_error(self, client_with_provider):
        """When provider credentials are invalid, a 503 should be returned."""
        client, provider, db = client_with_provider

        provider.generate_response.side_effect = AuthenticationError(
            "Invalid API key",
            provider=ProviderType.ANTHROPIC,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Explain MFA",
                "mode": "explain",
            },
        )

        assert response.status_code == 503

    def test_provider_rate_limit_error(self, client_with_provider):
        """When the provider hits rate limits, a 503 should be returned."""
        client, provider, db = client_with_provider

        provider.generate_response.side_effect = RateLimitError(
            "Rate limit exceeded. Retry after 30 seconds.",
            provider=ProviderType.ANTHROPIC,
            retry_after=30,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Generate a report",
                "mode": "report",
            },
        )

        assert response.status_code == 503

    def test_provider_generic_exception(self, client_with_provider):
        """When an unexpected exception occurs, a 500 should be returned."""
        client, provider, db = client_with_provider

        provider.generate_response.side_effect = RuntimeError("Unexpected internal error")

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Something",
                "mode": "explain",
            },
        )

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data

    def test_invalid_framework_code(self, client_with_provider):
        """An invalid framework code should return a 400 error."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=invalid_framework",
            json={
                "message": "Create a metric",
                "mode": "metrics",
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert "invalid framework" in data["detail"].lower()

    def test_empty_message(self, client_with_provider):
        """An empty message should be rejected by Pydantic validation (422)."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "",
                "mode": "metrics",
            },
        )

        assert response.status_code == 422

    def test_missing_required_fields(self, client_with_provider):
        """A request missing required fields should return 422."""
        client, provider, db = client_with_provider

        # Missing 'message' field entirely
        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "mode": "metrics",
            },
        )

        assert response.status_code == 422

    def test_invalid_mode(self, client_with_provider):
        """An invalid mode should be rejected by Pydantic validation (422)."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Something",
                "mode": "invalid_mode",
            },
        )

        assert response.status_code == 422

    def test_message_too_long(self, client_with_provider):
        """A message exceeding max_length should be rejected (422)."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "x" * 2001,  # max_length is 2000
                "mode": "metrics",
            },
        )

        assert response.status_code == 422


# =============================================================================
# MULTI-FRAMEWORK CONTEXT TESTS
# =============================================================================

class TestMultiFrameworkContext:
    """Tests for framework-specific system prompts and context."""

    def test_csf_framework_context(self):
        """CSF 2.0 system prompt should contain CSF-specific function names."""
        prompt = get_system_prompt_for_mode("metrics", "csf_2_0")

        assert "NIST CSF 2.0" in prompt
        assert "GOVERN" in prompt
        assert "IDENTIFY" in prompt
        assert "PROTECT" in prompt
        assert "DETECT" in prompt
        assert "RESPOND" in prompt
        assert "RECOVER" in prompt

    def test_ai_rmf_framework_context(self):
        """AI RMF system prompt should contain AI RMF-specific function names."""
        prompt = get_system_prompt_for_mode("metrics", "ai_rmf")

        assert "AI RMF" in prompt
        assert "GOVERN" in prompt
        assert "MAP" in prompt
        assert "MEASURE" in prompt
        assert "MANAGE" in prompt

    def test_explain_mode_prompt_content(self):
        """Explain mode prompt should focus on business language."""
        prompt = get_system_prompt_for_mode("explain", "csf_2_0")

        assert "business language" in prompt.lower() or "non-technical" in prompt.lower()
        assert "scoring" in prompt.lower() or "gap-to-target" in prompt.lower()

    def test_report_mode_prompt_content(self):
        """Report mode prompt should focus on executive narrative."""
        prompt = get_system_prompt_for_mode("report", "csf_2_0")

        assert "executive" in prompt.lower()
        assert "narrative" in prompt.lower() or "briefing" in prompt.lower()

    def test_recommendations_mode_prompt_content(self):
        """Recommendations mode prompt should focus on gap analysis."""
        prompt = get_system_prompt_for_mode("recommendations", "csf_2_0")

        assert "coverage gaps" in prompt.lower() or "gap" in prompt.lower()
        assert "recommend" in prompt.lower()

    def test_unknown_mode_uses_default(self):
        """An unknown mode should fall back to a generic assistant prompt."""
        prompt = get_system_prompt_for_mode("unknown_mode", "csf_2_0")

        assert "cybersecurity" in prompt.lower()
        assert "NIST CSF 2.0" in prompt

    def test_unknown_framework_uses_csf_default(self):
        """An unknown framework code should fall back to CSF 2.0 context."""
        prompt = get_system_prompt_for_mode("metrics", "nonexistent_framework")

        # Should fall back to csf_2_0
        assert "NIST CSF 2.0" in prompt

    def test_chat_with_csf_framework(self, client_with_provider):
        """The /ai/chat endpoint should pass the correct framework to the system prompt."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric for asset inventory",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200

        # Check that the system prompt passed to the provider contains CSF content
        call_args = provider.generate_response.call_args
        system_prompt = call_args.kwargs.get("system_prompt", "")
        assert "NIST CSF 2.0" in system_prompt

    def test_chat_with_ai_rmf_framework(self, client_with_provider):
        """The /ai/chat endpoint should pass AI RMF context when framework=ai_rmf."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=ai_rmf",
            json={
                "message": "Create a metric for AI model bias detection",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200

        call_args = provider.generate_response.call_args
        system_prompt = call_args.kwargs.get("system_prompt", "")
        assert "AI RMF" in system_prompt


# =============================================================================
# AI STATUS ENDPOINT TESTS
# =============================================================================

class TestAIStatus:
    """Tests for the GET /ai/status endpoint."""

    def test_status_no_provider(self, client):
        """When no provider is configured, status should show available=False."""
        response = client.get("/api/v1/ai/status")

        assert response.status_code == 200
        data = response.json()

        assert data["available"] is False
        assert "supported_providers" in data
        assert "supported_modes" in data
        assert "supported_frameworks" in data

    def test_status_with_provider(self, client_with_provider):
        """When a provider is configured, status should show available=True."""
        client, provider, db = client_with_provider

        response = client.get("/api/v1/ai/status")

        assert response.status_code == 200
        data = response.json()

        assert data["available"] is True
        assert data["provider"] == "anthropic"
        assert data["model"] is not None

    def test_status_supported_lists(self, client_with_provider):
        """Status should list all supported providers, modes, and frameworks."""
        client, provider, db = client_with_provider

        response = client.get("/api/v1/ai/status")
        data = response.json()

        assert "anthropic" in data["supported_providers"]
        assert "openai" in data["supported_providers"]
        assert "together" in data["supported_providers"]

        assert "metrics" in data["supported_modes"]
        assert "explain" in data["supported_modes"]
        assert "report" in data["supported_modes"]

        assert "csf_2_0" in data["supported_frameworks"]
        assert "ai_rmf" in data["supported_frameworks"]
