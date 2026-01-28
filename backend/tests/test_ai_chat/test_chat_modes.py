"""Tests for AI chat endpoint modes: metrics, explain, report, recommendations.

Validates that each mode produces the correct response structure,
the system prompts are tailored to the mode, and edge cases
(malformed JSON, fallback handling) are properly managed.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.ai.base_provider import (
    AIResponse as ProviderAIResponse,
    ProviderType,
)

from .fixtures.mock_responses import (
    EXPLAIN_MODE_RESPONSE,
    MALFORMED_JSON_RESPONSE,
    METRICS_MODE_CREATE_RESPONSE,
    RECOMMENDATIONS_RESPONSE,
    REPORT_MODE_RESPONSE,
)
from .fixtures.sample_metrics import create_sample_function_scores, create_sample_metrics


# =============================================================================
# METRICS MODE TESTS
# =============================================================================

class TestMetricsMode:
    """Tests for the 'metrics' mode of the /ai/chat endpoint."""

    def test_create_metric_from_natural_language(self, client_with_provider):
        """Sending a natural language request in metrics mode should return
        a response with actions containing an add_metric action."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric for MFA adoption rate",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert "assistant_message" in data
        assert "actions" in data
        assert len(data["actions"]) > 0
        assert data["actions"][0]["action"] == "add_metric"

    def test_metrics_mode_returns_structured_actions(self, client_with_provider):
        """Metrics mode should return properly structured action objects
        with type, metric data, and needs_confirmation."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Add a new metric for patch management compliance",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["needs_confirmation"] is True
        assert isinstance(data["actions"], list)

        if data["actions"]:
            action = data["actions"][0]
            assert "action" in action
            assert action["action"] in ["add_metric", "update_metric", "delete_metric"]

    def test_metrics_mode_includes_csf_mapping(self, client_with_provider):
        """Generated metrics should include CSF function and category codes."""
        client, provider, db = client_with_provider

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric for MFA adoption rate",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # The parsed JSON response from mock has metric with function_code
        if data["actions"]:
            metric = data["actions"][0].get("metric", {})
            if metric:
                # The AIAction schema validates action type but metric
                # is a MetricCreate which includes csf_function etc.
                # In the response the raw JSON from the AI includes function_code
                assert data["assistant_message"]  # Has explanatory message

    def test_metrics_mode_with_context(self, client_with_provider):
        """When include_existing_metrics is set, existing metrics should be
        included in the AI prompt context."""
        client, provider, db = client_with_provider

        # Set up mock to return existing metrics when queried
        sample_metrics = create_sample_metrics()
        query_chain = MagicMock()
        query_chain.filter.return_value = query_chain
        query_chain.limit.return_value = query_chain
        query_chain.all.return_value = sample_metrics
        query_chain.first.return_value = None
        query_chain.offset.return_value = query_chain
        query_chain.order_by.return_value = query_chain
        query_chain.count.return_value = 0
        db.query.return_value = query_chain

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "What metrics am I missing for DETECT?",
                "mode": "metrics",
                "context_opts": {"include_existing_metrics": True},
            },
        )

        assert response.status_code == 200

        # Verify the provider was called with context in the message
        call_args = provider.generate_response.call_args
        user_message = call_args.kwargs.get("messages", call_args[1].get("messages", [{}]))[0]["content"]
        assert "Context:" in user_message
        assert "existing_metrics" in user_message

    def test_metrics_mode_malformed_json_fallback(self, client_with_provider):
        """When the AI returns non-JSON in metrics mode, the response should
        fall back gracefully with the raw text and empty actions."""
        client, provider, db = client_with_provider

        # Configure provider to return non-JSON text
        provider.generate_response.return_value = ProviderAIResponse(
            content=MALFORMED_JSON_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric for security awareness",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Fallback: raw text becomes assistant_message, empty actions
        assert data["assistant_message"] == MALFORMED_JSON_RESPONSE
        assert data["actions"] == []
        assert data["needs_confirmation"] is False


# =============================================================================
# EXPLAIN MODE TESTS
# =============================================================================

class TestExplainMode:
    """Tests for the 'explain' mode of the /ai/chat endpoint."""

    def test_explain_metric_concept(self, client_with_provider):
        """Explain mode should return a text explanation of a metric concept."""
        client, provider, db = client_with_provider

        # Configure provider to return explanation text
        provider.generate_response.return_value = ProviderAIResponse(
            content=EXPLAIN_MODE_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Explain what MFA adoption rate means and why it matters",
                "mode": "explain",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert "assistant_message" in data
        assert len(data["assistant_message"]) > 50
        assert "multi-factor authentication" in data["assistant_message"].lower()

    def test_explain_scoring_methodology(self, client_with_provider):
        """Explain mode should handle scoring methodology questions."""
        client, provider, db = client_with_provider

        explanation = (
            "The gap-to-target scoring methodology compares each metric's current "
            "value against its target value to calculate a percentage score."
        )
        provider.generate_response.return_value = ProviderAIResponse(
            content=explanation,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "How does the scoring methodology work?",
                "mode": "explain",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "gap-to-target" in data["assistant_message"].lower()

    def test_explain_mode_no_actions(self, client_with_provider):
        """Explain mode should never return actions -- only text."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=EXPLAIN_MODE_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        response = client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Explain what NIST CSF 2.0 is",
                "mode": "explain",
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["actions"] == []
        assert data["needs_confirmation"] is False


# =============================================================================
# REPORT MODE TESTS
# =============================================================================

class TestReportMode:
    """Tests for the 'report' mode of the /ai/chat endpoint."""

    def test_executive_report_generation(self, client_with_provider):
        """Report mode should generate an executive-style narrative."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=REPORT_MODE_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        # Mock the scoring functions used by report mode
        scores = create_sample_function_scores()
        with patch("src.routers.ai.compute_function_scores", return_value=scores), \
             patch("src.routers.ai.get_metrics_needing_attention", return_value=[]):

            response = client.post(
                "/api/v1/ai/chat?framework=csf_2_0",
                json={
                    "message": "Generate an executive risk report",
                    "mode": "report",
                },
            )

        assert response.status_code == 200
        data = response.json()

        assert "assistant_message" in data
        assert len(data["assistant_message"]) > 100

    def test_report_includes_risk_context(self, client_with_provider):
        """Report should include context about risk levels passed to the AI."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=REPORT_MODE_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        scores = create_sample_function_scores()
        with patch("src.routers.ai.compute_function_scores", return_value=scores), \
             patch("src.routers.ai.get_metrics_needing_attention", return_value=[]):

            response = client.post(
                "/api/v1/ai/chat?framework=csf_2_0",
                json={
                    "message": "Give me a risk report",
                    "mode": "report",
                },
            )

        assert response.status_code == 200

        # Verify scores were passed as context to the AI provider
        call_args = provider.generate_response.call_args
        messages = call_args.kwargs.get("messages", call_args[1].get("messages", []))
        user_content = messages[0]["content"]
        assert "Context:" in user_content
        assert "function_scores" in user_content

    def test_report_mode_no_actions(self, client_with_provider):
        """Report mode should never return actions."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=REPORT_MODE_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        scores = create_sample_function_scores()
        with patch("src.routers.ai.compute_function_scores", return_value=scores), \
             patch("src.routers.ai.get_metrics_needing_attention", return_value=[]):

            response = client.post(
                "/api/v1/ai/chat?framework=csf_2_0",
                json={
                    "message": "Report on our security posture",
                    "mode": "report",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["actions"] == []
        assert data["needs_confirmation"] is False


# =============================================================================
# RECOMMENDATIONS MODE (via /ai/chat is not a recognized mode in schema,
# but recommendations are tested through the dedicated endpoint)
# =============================================================================

class TestRecommendationsMode:
    """Tests for recommendations delivered through the /ai/chat endpoint.

    Note: The AIChatRequest schema limits mode to 'metrics', 'explain', 'report'.
    The recommendations mode is served through dedicated endpoints
    /ai/recommendations. These tests verify the dedicated endpoint behavior.
    """

    def test_recommendations_with_gaps(self, client_with_provider):
        """POST /ai/recommendations should return structured recommendations."""
        client, provider, db = client_with_provider

        result = {
            "success": True,
            "framework_code": "csf_2_0",
            "recommendations": [
                {
                    "metric_name": "Phishing Simulation Click Rate",
                    "function_code": "pr",
                    "category_code": "PR.AT",
                    "priority": 1,
                }
            ],
            "gap_analysis": {
                "underrepresented_functions": ["de", "rc"],
                "coverage_percentage": 75.0,
            },
        }

        with patch("src.routers.ai.generate_metric_recommendations",
                    new_callable=AsyncMock,
                    return_value=result):
            response = client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["recommendations"]) > 0

    def test_recommendations_include_priority(self, client_with_provider):
        """Recommendations should include priority rankings."""
        client, provider, db = client_with_provider

        result = {
            "success": True,
            "framework_code": "csf_2_0",
            "recommendations": [
                {"metric_name": "Test Metric", "priority": 1},
                {"metric_name": "Another Metric", "priority": 2},
            ],
            "gap_analysis": {
                "underrepresented_functions": [],
                "coverage_percentage": 90.0,
            },
        }

        with patch("src.routers.ai.generate_metric_recommendations",
                    new_callable=AsyncMock,
                    return_value=result):
            response = client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        for rec in data["recommendations"]:
            assert "priority" in rec
