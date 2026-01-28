"""Tests for the AI generate-metric endpoint.

Validates the POST /ai/generate-metric endpoint which uses AI to
create a complete metric definition from just a metric name.

Tests cover:
- Successful metric generation with full CSF hierarchy resolution
- Automatic metric_number assignment
- Function/category/subcategory ID resolution
- Graceful fallback when AI returns unparseable responses
- Framework not found errors
- Provider errors
"""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models import (
    Framework,
    FrameworkCategory,
    FrameworkFunction,
    FrameworkSubcategory,
    Metric,
)
from src.services.ai.base_provider import (
    AIProviderError,
    AIResponse as ProviderAIResponse,
    ProviderType,
)

from .fixtures.mock_responses import GENERATE_METRIC_RESPONSE
from .fixtures.sample_metrics import (
    create_sample_categories,
    create_sample_framework,
    create_sample_functions,
    create_sample_subcategories,
)


def _setup_framework_hierarchy(mock_db):
    """Configure mock_db to return a realistic framework hierarchy.

    Sets up the database mock so that queries for Framework,
    FrameworkFunction, FrameworkCategory, and FrameworkSubcategory
    return appropriate test data.

    Returns:
        tuple: (framework, functions, categories, subcategories) mock objects
    """
    fw_id = uuid.uuid4()
    func_pr_id = uuid.uuid4()
    cat_pr_ps_id = uuid.uuid4()
    subcat_pr_ps_02_id = uuid.uuid4()

    # Framework mock
    framework = MagicMock(spec=Framework)
    framework.id = fw_id
    framework.code = "csf_2_0"
    framework.name = "NIST Cybersecurity Framework 2.0"

    # Function mock (PROTECT)
    func_pr = MagicMock(spec=FrameworkFunction)
    func_pr.id = func_pr_id
    func_pr.framework_id = fw_id
    func_pr.code = "pr"
    func_pr.name = "Protect"

    # Category mock (PR.PS)
    cat_pr_ps = MagicMock(spec=FrameworkCategory)
    cat_pr_ps.id = cat_pr_ps_id
    cat_pr_ps.function_id = func_pr_id
    cat_pr_ps.code = "PR.PS"
    cat_pr_ps.name = "Platform Security"

    # Subcategory mock (PR.PS-02)
    subcat_pr_ps_02 = MagicMock(spec=FrameworkSubcategory)
    subcat_pr_ps_02.id = subcat_pr_ps_02_id
    subcat_pr_ps_02.category_id = cat_pr_ps_id
    subcat_pr_ps_02.code = "PR.PS-02"
    subcat_pr_ps_02.outcome = "Software is maintained, replaced, and removed commensurate with risk"

    # Configure query chains
    # We need to handle multiple query().filter().first() calls for different models
    def query_side_effect(model):
        chain = MagicMock()
        chain.filter.return_value = chain
        chain.limit.return_value = chain
        chain.offset.return_value = chain
        chain.order_by.return_value = chain

        if model is Framework:
            chain.first.return_value = framework
        elif model is FrameworkFunction:
            chain.all.return_value = [func_pr]
            chain.first.return_value = func_pr
        elif model is FrameworkCategory:
            chain.all.return_value = [cat_pr_ps]
            chain.first.return_value = cat_pr_ps
        elif model is FrameworkSubcategory:
            chain.all.return_value = [subcat_pr_ps_02]
            chain.first.return_value = subcat_pr_ps_02
        elif model is Metric:
            chain.all.return_value = []
            chain.first.return_value = None
            chain.like = MagicMock(return_value=chain)
        else:
            chain.first.return_value = None
            chain.all.return_value = []

        return chain

    mock_db.query.side_effect = query_side_effect

    return framework, func_pr, cat_pr_ps, subcat_pr_ps_02


class TestGenerateMetric:
    """Tests for the POST /ai/generate-metric endpoint."""

    def test_generate_complete_metric(self, client_with_provider):
        """A valid request should return a complete metric definition."""
        client, provider, db = client_with_provider

        # Configure the provider to return the metric JSON
        provider.generate_response.return_value = ProviderAIResponse(
            content=GENERATE_METRIC_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Vulnerability%20Remediation%20SLA%20Compliance"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "metric" in data
        metric = data["metric"]
        assert metric["name"] == "Vulnerability Remediation SLA Compliance"
        assert metric["direction"] == "higher_is_better"
        assert metric["priority_rank"] == 1
        assert metric["active"] is True
        assert "description" in metric
        assert "formula" in metric

    def test_generate_assigns_metric_number(self, client_with_provider):
        """Generated metrics should receive an auto-generated metric_number."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=GENERATE_METRIC_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Vulnerability%20Remediation%20SLA%20Compliance"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()

        metric = data["metric"]
        assert "metric_number" in metric
        # Pattern: CSF-PR-001 (CSF prefix, function code, sequential number)
        assert metric["metric_number"].startswith("CSF-PR-")

    def test_generate_resolves_csf_hierarchy(self, client_with_provider):
        """Generated metrics should have function_id, category_id, and subcategory_id
        resolved from the CSF codes in the AI response."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=GENERATE_METRIC_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        fw, func, cat, subcat = _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Vulnerability%20Remediation%20SLA%20Compliance"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()
        metric = data["metric"]

        # Verify IDs were resolved
        assert "function_id" in metric
        assert metric["function_id"] == str(func.id)

        assert "framework_id" in metric
        assert metric["framework_id"] == str(fw.id)

        assert "category_id" in metric
        assert metric["category_id"] == str(cat.id)

        assert "subcategory_id" in metric
        assert metric["subcategory_id"] == str(subcat.id)

    def test_generate_handles_parse_failure(self, client_with_provider):
        """When AI returns unparseable response, should return graceful fallback."""
        client, provider, db = client_with_provider

        # Return non-JSON content
        provider.generate_response.return_value = ProviderAIResponse(
            content="I cannot generate a valid metric for that request. Please try again.",
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Invalid%20Metric%20Name"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is False
        assert "error" in data
        assert "raw_response" in data
        # A partial metric shell should still be returned
        assert "metric" in data
        assert data["metric"]["name"] == "Invalid Metric Name"

    def test_generate_handles_markdown_code_blocks(self, client_with_provider):
        """When AI wraps JSON in markdown code blocks, they should be stripped."""
        client, provider, db = client_with_provider

        # Wrap the JSON in markdown code blocks
        response_with_markdown = f"```json\n{GENERATE_METRIC_RESPONSE}\n```"

        provider.generate_response.return_value = ProviderAIResponse(
            content=response_with_markdown,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Vulnerability%20Remediation%20SLA%20Compliance"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_generate_framework_not_found(self, client_with_provider):
        """When the framework does not exist, should return 404."""
        client, provider, db = client_with_provider

        # Configure db so Framework query returns None
        def query_side_effect(model):
            chain = MagicMock()
            chain.filter.return_value = chain
            chain.first.return_value = None
            chain.all.return_value = []
            return chain

        db.query.side_effect = query_side_effect

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Test%20Metric"
            "&framework=nonexistent_fw"
        )

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_generate_provider_error(self, client_with_provider):
        """When the AI provider raises an error, should return 503."""
        client, provider, db = client_with_provider

        provider.generate_response.side_effect = AIProviderError(
            "Service unavailable", provider=ProviderType.ANTHROPIC
        )

        _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Test%20Metric"
            "&framework=csf_2_0"
        )

        assert response.status_code == 503

    def test_generate_metric_number_increments(self, client_with_provider):
        """Metric number should increment based on existing metrics for that function."""
        client, provider, db = client_with_provider

        provider.generate_response.return_value = ProviderAIResponse(
            content=GENERATE_METRIC_RESPONSE,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        # Set up framework hierarchy but with existing metrics
        fw, func, cat, subcat = _setup_framework_hierarchy(db)

        # Override the Metric query to return existing metrics
        original_side_effect = db.query.side_effect

        def query_with_existing_metrics(model):
            chain = original_side_effect(model)
            if model is Metric:
                existing_metric = MagicMock()
                existing_metric.metric_number = "CSF-PR-005"
                chain.all.return_value = [existing_metric]
            return chain

        db.query.side_effect = query_with_existing_metrics

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Vulnerability%20Remediation%20SLA%20Compliance"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()

        # Should be CSF-PR-006 (incremented from existing CSF-PR-005)
        assert data["metric"]["metric_number"] == "CSF-PR-006"

    def test_generate_string_target_value_conversion(self, client_with_provider):
        """When AI returns target_value as string, it should be converted to float."""
        client, provider, db = client_with_provider

        # Modify the response to have a string target_value
        metric_data = json.loads(GENERATE_METRIC_RESPONSE)
        metric_data["target_value"] = "95.5"
        modified_response = json.dumps(metric_data)

        provider.generate_response.return_value = ProviderAIResponse(
            content=modified_response,
            model_used="claude-sonnet-4-5-20250929",
            provider=ProviderType.ANTHROPIC,
        )

        _setup_framework_hierarchy(db)

        response = client.post(
            "/api/v1/ai/generate-metric"
            "?metric_name=Vulnerability%20Remediation%20SLA%20Compliance"
            "&framework=csf_2_0"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["metric"]["target_value"] == 95.5
