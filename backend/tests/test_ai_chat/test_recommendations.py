"""Tests for AI recommendations endpoints.

Validates:
- POST /ai/recommendations - AI-powered metric recommendations
- GET /ai/recommendations/gaps - Framework coverage gaps
- POST /ai/recommendations/suggest - Targeted metric suggestions
- GET /ai/recommendations/distribution - Metric distribution analysis
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.services.ai.base_provider import AIProviderError, ProviderType


class TestGetRecommendationsEndpoint:
    """Tests for the POST /ai/recommendations endpoint."""

    def test_get_recommendations_endpoint(self, client_with_provider):
        """Successful request should return recommendations with gap analysis."""
        client, provider, db = client_with_provider

        result = {
            "success": True,
            "framework_code": "csf_2_0",
            "recommendations": [
                {
                    "metric_name": "Phishing Click Rate",
                    "description": "Percentage of employees clicking phishing simulations",
                    "function_code": "pr",
                    "category_code": "PR.AT",
                    "priority": 1,
                    "rationale": "No training effectiveness metrics exist",
                    "expected_impact": "Visibility into human risk",
                },
                {
                    "metric_name": "Vendor Risk Assessment Coverage",
                    "description": "Percentage of critical vendors assessed",
                    "function_code": "gv",
                    "category_code": "GV.SC",
                    "priority": 2,
                    "rationale": "Supply chain risk gap",
                    "expected_impact": "Better third-party risk visibility",
                },
            ],
            "gap_analysis": {
                "underrepresented_functions": ["de", "rc"],
                "coverage_percentage": 75.0,
                "overall_assessment": "Coverage needs improvement in DETECT and RECOVER.",
            },
        }

        with patch(
            "src.routers.ai.generate_metric_recommendations",
            new_callable=AsyncMock,
            return_value=result,
        ):
            response = client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert len(data["recommendations"]) == 2
        assert "gap_analysis" in data
        assert data["gap_analysis"]["coverage_percentage"] == 75.0

    def test_recommendations_with_max_count(self, client_with_provider):
        """max_recommendations parameter should be passed through."""
        client, provider, db = client_with_provider

        result = {
            "success": True,
            "framework_code": "csf_2_0",
            "recommendations": [{"metric_name": "Single Recommendation"}],
            "gap_analysis": {"underrepresented_functions": [], "coverage_percentage": 90.0},
        }

        with patch(
            "src.routers.ai.generate_metric_recommendations",
            new_callable=AsyncMock,
            return_value=result,
        ) as mock_gen:
            response = client.post(
                "/api/v1/ai/recommendations?framework=csf_2_0&max_recommendations=3"
            )

        assert response.status_code == 200
        # Verify the max_recommendations parameter was passed through
        mock_gen.assert_called_once()
        call_args = mock_gen.call_args
        assert call_args[0][1] == "csf_2_0"  # framework
        assert call_args[0][2] == 3  # max_recommendations

    def test_recommendations_no_provider(self, client, mock_db):
        """When no AI provider is available, should return 503."""
        response = client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 503
        data = response.json()
        assert "not available" in data["detail"].lower()

    def test_recommendations_failure(self, client_with_provider):
        """When recommendation generation fails, should return 500."""
        client, provider, db = client_with_provider

        result = {
            "success": False,
            "error": "Failed to parse AI response",
        }

        with patch(
            "src.routers.ai.generate_metric_recommendations",
            new_callable=AsyncMock,
            return_value=result,
        ):
            response = client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 500


class TestCoverageGaps:
    """Tests for the GET /ai/recommendations/gaps endpoint."""

    def test_coverage_gaps_calculation(self, client_with_provider):
        """Should return framework coverage gap analysis."""
        client, provider, db = client_with_provider

        gaps = {
            "framework_code": "csf_2_0",
            "total_functions": 6,
            "functions_with_metrics": 4,
            "gaps": [
                {
                    "function_code": "de",
                    "function_name": "Detect",
                    "categories_without_metrics": ["DE.AE"],
                    "metric_count": 2,
                },
                {
                    "function_code": "rc",
                    "function_name": "Recover",
                    "categories_without_metrics": ["RC.CO"],
                    "metric_count": 1,
                },
            ],
        }

        with patch("src.routers.ai.get_coverage_gaps", return_value=gaps):
            response = client.get("/api/v1/ai/recommendations/gaps?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        assert data["total_functions"] == 6
        assert len(data["gaps"]) == 2

    def test_coverage_gaps_error(self, client_with_provider):
        """When framework is not found, should return 404."""
        client, provider, db = client_with_provider

        with patch(
            "src.routers.ai.get_coverage_gaps",
            return_value={"error": "Framework 'nonexistent' not found"},
        ):
            response = client.get(
                "/api/v1/ai/recommendations/gaps?framework=nonexistent"
            )

        assert response.status_code == 404


class TestRecommendationsByFunction:
    """Tests for POST /ai/recommendations/suggest endpoint."""

    def test_recommendations_by_function(self, client_with_provider):
        """Should return suggestions filtered by function code."""
        client, provider, db = client_with_provider

        result = {
            "success": True,
            "suggestions": [
                {
                    "metric_name": "Alert Triage Time",
                    "function_code": "de",
                    "category_code": "DE.AE",
                    "description": "Average time to triage security alerts",
                }
            ],
        }

        with patch(
            "src.routers.ai.suggest_metrics_for_gap",
            new_callable=AsyncMock,
            return_value=result,
        ):
            response = client.post(
                "/api/v1/ai/recommendations/suggest"
                "?framework=csf_2_0&function_code=de&count=5"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_recommendations_suggest_no_provider(self, client, mock_db):
        """When no AI provider is available, should return 503."""
        response = client.post(
            "/api/v1/ai/recommendations/suggest?framework=csf_2_0"
        )

        assert response.status_code == 503

    def test_recommendations_suggest_failure(self, client_with_provider):
        """When suggestion generation fails, should return 500."""
        client, provider, db = client_with_provider

        result = {
            "success": False,
            "error": "AI generation failed",
        }

        with patch(
            "src.routers.ai.suggest_metrics_for_gap",
            new_callable=AsyncMock,
            return_value=result,
        ):
            response = client.post(
                "/api/v1/ai/recommendations/suggest?framework=csf_2_0"
            )

        assert response.status_code == 500


class TestMetricsDistribution:
    """Tests for GET /ai/recommendations/distribution endpoint."""

    def test_distribution_endpoint(self, client_with_provider):
        """Should return metric distribution across framework functions."""
        client, provider, db = client_with_provider

        distribution = {
            "framework_code": "csf_2_0",
            "total_metrics": 208,
            "distribution": {
                "gv": {"count": 36, "percentage": 17.3},
                "id": {"count": 35, "percentage": 16.8},
                "pr": {"count": 44, "percentage": 21.2},
                "de": {"count": 32, "percentage": 15.4},
                "rs": {"count": 30, "percentage": 14.4},
                "rc": {"count": 31, "percentage": 14.9},
            },
        }

        with patch("src.routers.ai.get_metric_distribution", return_value=distribution):
            response = client.get(
                "/api/v1/ai/recommendations/distribution?framework=csf_2_0"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["total_metrics"] == 208

    def test_distribution_error(self, client_with_provider):
        """When framework is not found, should return 404."""
        client, provider, db = client_with_provider

        with patch(
            "src.routers.ai.get_metric_distribution",
            return_value={"error": "Framework not found"},
        ):
            response = client.get(
                "/api/v1/ai/recommendations/distribution?framework=bad_code"
            )

        assert response.status_code == 404
