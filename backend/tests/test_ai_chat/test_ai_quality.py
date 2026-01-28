"""AI Quality/Evaluation Tests - Validate AI responses make semantic sense.

These tests call the REAL AI endpoints (not mocked) and verify:
1. Generated metrics have valid CSF/AI-RMF codes
2. Formulas are parseable and make mathematical sense
3. Recommendations are relevant to identified gaps
4. Explanations are coherent and accurate
5. Reports contain appropriate risk context

These tests require a configured AI provider and will be skipped if unavailable.
Run with: pytest tests/test_ai_chat/test_ai_quality.py -v --tb=short

Note: These tests make actual AI API calls and may incur costs.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Set

import pytest
from fastapi.testclient import TestClient

# Skip all tests if no AI provider is configured
pytestmark = pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY") and not os.getenv("OPENAI_API_KEY"),
    reason="No AI provider API key configured"
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture(scope="module")
def real_client():
    """Create a test client connected to the real database and AI provider."""
    from src.main import app
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="module")
def csf_valid_codes(real_client) -> Dict[str, Set[str]]:
    """Fetch valid CSF 2.0 function and category codes from the API."""
    response = real_client.get("/api/v1/frameworks/csf_2_0/hierarchy")
    if response.status_code != 200:
        pytest.skip("Could not fetch CSF hierarchy")

    data = response.json()
    codes = {
        "functions": set(),
        "categories": set(),
        "subcategories": set(),
    }

    for func in data.get("functions", []):
        codes["functions"].add(func["code"].lower())
        for cat in func.get("categories", []):
            codes["categories"].add(cat["code"].upper())
            for subcat in cat.get("subcategories", []):
                codes["subcategories"].add(subcat["code"].upper())

    return codes


@pytest.fixture(scope="module")
def ai_rmf_valid_codes(real_client) -> Dict[str, Set[str]]:
    """Fetch valid AI RMF function and category codes from the API."""
    response = real_client.get("/api/v1/frameworks/ai_rmf/hierarchy")
    if response.status_code != 200:
        pytest.skip("Could not fetch AI RMF hierarchy")

    data = response.json()
    codes = {
        "functions": set(),
        "categories": set(),
    }

    for func in data.get("functions", []):
        codes["functions"].add(func["code"].lower())
        for cat in func.get("categories", []):
            codes["categories"].add(cat["code"].upper())

    return codes


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def is_valid_formula(formula: str) -> bool:
    """Check if a formula string makes mathematical sense."""
    if not formula or len(formula) < 3:
        return False

    # Should contain a division, multiplication, or percentage operation
    has_operator = any(op in formula for op in ['/', '*', '%', '+', '-', 'x', '×', '÷'])

    # Should not have obvious errors
    bad_patterns = [
        r'^\s*$',           # Empty
        r'^[0-9]+$',        # Just a number
        r'\/ *0\b',         # Division by zero
        r'× *100 *$',       # Ends with "× 100" (should be handled by system)
    ]

    for pattern in bad_patterns:
        if re.search(pattern, formula):
            return False

    return has_operator


def extract_json_from_response(content: str) -> Optional[Dict]:
    """Extract JSON from AI response that may have markdown code blocks."""
    # Try direct parse first
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Try extracting from code blocks
    patterns = [
        r'```json\s*([\s\S]*?)\s*```',
        r'```\s*([\s\S]*?)\s*```',
        r'\{[\s\S]*\}',
    ]

    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            try:
                return json.loads(match.group(1) if '```' in pattern else match.group(0))
            except json.JSONDecodeError:
                continue

    return None


def validate_metric_structure(metric: Dict, framework: str = "csf_2_0") -> List[str]:
    """Validate a generated metric has required fields and valid values."""
    errors = []

    # Required fields
    required_fields = ["name", "description", "direction"]
    for field in required_fields:
        if field not in metric or not metric[field]:
            errors.append(f"Missing required field: {field}")

    # Name should be descriptive (not just a few characters)
    if metric.get("name") and len(metric["name"]) < 10:
        errors.append(f"Metric name too short: '{metric['name']}'")

    # Description should be meaningful
    if metric.get("description") and len(metric["description"]) < 20:
        errors.append(f"Description too short: '{metric['description']}'")

    # Direction should be valid
    valid_directions = ["higher_is_better", "lower_is_better", "target_range", "binary"]
    if metric.get("direction") and metric["direction"] not in valid_directions:
        errors.append(f"Invalid direction: '{metric['direction']}'")

    # Target value should be numeric if present
    if metric.get("target_value") is not None:
        try:
            float(metric["target_value"])
        except (TypeError, ValueError):
            errors.append(f"Invalid target_value: '{metric['target_value']}'")

    # Formula should be parseable if present
    if metric.get("formula") and not is_valid_formula(metric["formula"]):
        errors.append(f"Invalid formula: '{metric['formula']}'")

    # Priority rank should be 1-3
    if metric.get("priority_rank"):
        try:
            priority = int(metric["priority_rank"])
            if priority < 1 or priority > 3:
                errors.append(f"Priority rank out of range: {priority}")
        except (TypeError, ValueError):
            errors.append(f"Invalid priority_rank: '{metric['priority_rank']}'")

    return errors


# =============================================================================
# CSF 2.0 METRIC GENERATION QUALITY TESTS
# =============================================================================

class TestCSFMetricGenerationQuality:
    """Test that AI-generated CSF 2.0 metrics are valid and sensible."""

    def test_generated_metric_has_valid_csf_codes(self, real_client, csf_valid_codes):
        """Generated metrics should map to real CSF 2.0 function/category codes."""
        # Note: generate-metric uses query params, not JSON body
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Security Awareness Training Completion Rate",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # Verify function code is valid
        func_code = metric.get("csf_function", "").lower()
        assert func_code in csf_valid_codes["functions"], \
            f"Invalid function code '{func_code}'. Valid codes: {csf_valid_codes['functions']}"

        # Verify category code is valid (if present)
        cat_code = metric.get("csf_category_code", "").upper()
        if cat_code:
            assert cat_code in csf_valid_codes["categories"], \
                f"Invalid category code '{cat_code}'. Valid codes: {csf_valid_codes['categories']}"

    def test_generated_metric_formula_is_valid(self, real_client):
        """Generated metrics should have mathematically valid formulas."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Mean Time to Detect Security Incidents",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        formula = metric.get("formula", "")
        assert formula, "Generated metric should have a formula"
        assert is_valid_formula(formula), f"Invalid formula: '{formula}'"

        # Formula should not end with "× 100" (system handles percentage display)
        assert not re.search(r'[×x\*]\s*100\s*$', formula), \
            f"Formula should not end with '× 100' (system handles display): '{formula}'"

    def test_generated_metric_structure_is_complete(self, real_client):
        """Generated metrics should have all required fields with valid values."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Vulnerability Remediation SLA Compliance",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        errors = validate_metric_structure(metric, "csf_2_0")
        assert not errors, f"Metric validation errors: {errors}"

    def test_generated_metric_direction_matches_intent(self, real_client):
        """Direction should logically match the metric's purpose."""
        # Test a metric where higher is clearly better
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Patch Management Compliance Rate",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # For a patch compliance metric, higher should be better
        assert metric.get("direction") == "higher_is_better", \
            f"Patch compliance should be 'higher_is_better', got '{metric.get('direction')}'"

    def test_generated_metric_for_lower_is_better(self, real_client):
        """Test metric where lower values are better."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Mean Time to Respond (MTTR)",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # For MTTR, lower should be better
        assert metric.get("direction") == "lower_is_better", \
            f"MTTR should be 'lower_is_better', got '{metric.get('direction')}'"

    def test_generated_metric_has_meaningful_risk_definition(self, real_client):
        """Generated metrics should have risk definitions explaining business impact."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Privileged Access Management Compliance",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        risk_def = metric.get("risk_definition", "")
        assert risk_def, "Metric should have a risk_definition"
        assert len(risk_def) >= 50, \
            f"Risk definition should be substantive (>=50 chars), got {len(risk_def)}"

        # Should mention business/security impact
        impact_keywords = ["risk", "impact", "threat", "vulnerability", "business",
                          "security", "compliance", "breach", "attack", "exposure"]
        has_impact_context = any(kw in risk_def.lower() for kw in impact_keywords)
        assert has_impact_context, \
            f"Risk definition should explain business/security impact: '{risk_def}'"


# =============================================================================
# AI RMF METRIC GENERATION QUALITY TESTS
# =============================================================================

class TestAIRMFMetricGenerationQuality:
    """Test that AI-generated AI RMF metrics are valid and sensible."""

    def test_generated_metric_has_valid_ai_rmf_codes(self, real_client, ai_rmf_valid_codes):
        """Generated metrics should map to real AI RMF function/category codes."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "AI Model Bias Testing Coverage",
                "framework": "ai_rmf",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # Verify function code is valid AI RMF function
        func_code = metric.get("csf_function", "").lower()
        assert func_code in ai_rmf_valid_codes["functions"], \
            f"Invalid AI RMF function code '{func_code}'. Valid: {ai_rmf_valid_codes['functions']}"

    def test_ai_rmf_metric_addresses_trustworthiness(self, real_client):
        """AI RMF metrics should address AI trustworthiness characteristics."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "AI Fairness and Bias Assessment Score",
                "framework": "ai_rmf",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # Should map to MEASURE function (bias testing)
        func_code = metric.get("csf_function", "").lower()
        assert func_code in ["measure", "map", "govern"], \
            f"Fairness metric should map to measure/map/govern, got '{func_code}'"

        # Description should mention fairness/bias concepts
        desc = metric.get("description", "").lower()
        fairness_keywords = ["fair", "bias", "equit", "discriminat", "disparate"]
        has_fairness_context = any(kw in desc for kw in fairness_keywords)
        assert has_fairness_context, \
            f"Fairness metric description should mention fairness concepts: '{desc}'"


# =============================================================================
# RECOMMENDATIONS QUALITY TESTS
# =============================================================================

class TestRecommendationsQuality:
    """Test that AI recommendations are relevant and actionable."""

    def test_recommendations_have_valid_codes(self, real_client, csf_valid_codes):
        """Recommended metrics should have valid framework codes."""
        response = real_client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        assert data.get("success") is True, f"Recommendations failed: {data}"

        for rec in data.get("recommendations", []):
            func_code = rec.get("function_code", "").lower()
            assert func_code in csf_valid_codes["functions"], \
                f"Invalid function code in recommendation: '{func_code}'"

            cat_code = rec.get("category_code", "").upper()
            if cat_code:
                assert cat_code in csf_valid_codes["categories"], \
                    f"Invalid category code in recommendation: '{cat_code}'"

    def test_recommendations_have_rationale(self, real_client):
        """Each recommendation should explain why it's needed."""
        response = real_client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        for rec in data.get("recommendations", []):
            rationale = rec.get("rationale", "")
            assert rationale, f"Recommendation '{rec.get('metric_name')}' missing rationale"
            assert len(rationale) >= 30, \
                f"Rationale too short for '{rec.get('metric_name')}': '{rationale}'"

    def test_recommendations_have_priorities(self, real_client):
        """Recommendations should have valid priority rankings."""
        response = real_client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        priorities_seen = set()
        for rec in data.get("recommendations", []):
            priority = rec.get("priority")
            assert priority is not None, f"Missing priority for '{rec.get('metric_name')}'"
            assert priority in [1, 2, 3], f"Invalid priority {priority} for '{rec.get('metric_name')}'"
            priorities_seen.add(priority)

        # Should have multiple priority levels (not all the same)
        if len(data.get("recommendations", [])) >= 3:
            assert len(priorities_seen) >= 2, \
                "Recommendations should have varied priorities, not all the same"

    def test_gap_analysis_identifies_weak_areas(self, real_client):
        """Gap analysis should identify underrepresented areas."""
        response = real_client.post("/api/v1/ai/recommendations?framework=csf_2_0")

        assert response.status_code == 200
        data = response.json()

        gap_analysis = data.get("gap_analysis", {})
        assert gap_analysis, "Response should include gap_analysis"

        # Should have an overall assessment
        assessment = gap_analysis.get("overall_assessment", "")
        assert assessment, "Gap analysis should have overall_assessment"
        assert len(assessment) >= 50, "Overall assessment should be substantive"

        # Coverage percentage should be a valid number
        coverage = gap_analysis.get("coverage_percentage")
        assert coverage is not None, "Should have coverage_percentage"
        assert 0 <= coverage <= 100, f"Invalid coverage percentage: {coverage}"


# =============================================================================
# CHAT RESPONSE QUALITY TESTS
# =============================================================================

class TestChatResponseQuality:
    """Test that AI chat responses are helpful and accurate."""

    def test_explain_mode_provides_educational_content(self, real_client):
        """Explain mode should provide educational, accurate explanations."""
        response = real_client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "What is Mean Time to Detect (MTTD) and why is it important?",
                "mode": "explain",
            },
        )

        assert response.status_code == 200
        data = response.json()

        explanation = data.get("assistant_message", "")
        assert explanation, "Should return an explanation"

        # Should mention key concepts
        assert "detect" in explanation.lower(), "Should explain detection"
        assert any(kw in explanation.lower() for kw in ["time", "speed", "quick", "fast", "hour", "minute"]), \
            "Should mention time aspect"

        # Should be educational (not just a one-liner)
        assert len(explanation) >= 200, \
            f"Explanation should be substantive (>=200 chars), got {len(explanation)}"

    def test_report_mode_generates_executive_summary(self, real_client):
        """Report mode should generate professional executive summaries."""
        response = real_client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Generate an executive summary of our cybersecurity posture",
                "mode": "report",
            },
        )

        assert response.status_code == 200
        data = response.json()

        report = data.get("assistant_message", "")
        assert report, "Should return a report"

        # Should have structure (headers, sections)
        has_structure = any(marker in report for marker in ["##", "**", ":", "-", "•"])
        assert has_structure, "Report should have formatting/structure"

        # Should mention risk concepts
        risk_keywords = ["risk", "score", "function", "protect", "detect", "govern",
                        "identify", "respond", "recover"]
        has_risk_context = sum(1 for kw in risk_keywords if kw in report.lower())
        assert has_risk_context >= 3, \
            f"Report should discuss risk/CSF concepts, found only {has_risk_context} keywords"

        # Should be substantial
        assert len(report) >= 500, \
            f"Executive report should be substantial (>=500 chars), got {len(report)}"

    def test_metrics_mode_returns_actionable_response(self, real_client):
        """Metrics mode should return structured, actionable responses."""
        response = real_client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "Create a metric to track phishing simulation click rates",
                "mode": "metrics",
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Should have an assistant message explaining what was done
        message = data.get("assistant_message", "")
        assert message, "Should have assistant message"

        # If actions are returned, they should be valid
        actions = data.get("actions", [])
        if actions:
            for action in actions:
                assert "action" in action, "Action should have 'action' field"
                assert action["action"] in ["add_metric", "update_metric", "delete_metric"], \
                    f"Invalid action type: {action['action']}"

                if action["action"] == "add_metric":
                    metric = action.get("metric", {})
                    errors = validate_metric_structure(metric)
                    assert not errors, f"Invalid metric in action: {errors}"


# =============================================================================
# SEMANTIC CONSISTENCY TESTS
# =============================================================================

class TestSemanticConsistency:
    """Test that AI responses are semantically consistent and accurate."""

    def test_protect_function_metrics_relate_to_protection(self, real_client):
        """Metrics assigned to PROTECT should relate to protective controls."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Data Encryption Coverage Rate",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # Encryption is a protective control - should map to PROTECT
        func_code = metric.get("csf_function", "").lower()
        assert func_code == "pr", \
            f"Encryption metric should map to PROTECT (pr), got '{func_code}'"

    def test_detect_function_metrics_relate_to_detection(self, real_client):
        """Metrics assigned to DETECT should relate to detection capabilities."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "SIEM Alert Processing Time",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # SIEM is a detection tool - should map to DETECT
        func_code = metric.get("csf_function", "").lower()
        assert func_code == "de", \
            f"SIEM metric should map to DETECT (de), got '{func_code}'"

    def test_governance_metrics_relate_to_governance(self, real_client):
        """Metrics assigned to GOVERN should relate to governance activities."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Board Cybersecurity Briefing Frequency",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        # Board briefings are governance - should map to GOVERN
        func_code = metric.get("csf_function", "").lower()
        assert func_code == "gv", \
            f"Board briefing metric should map to GOVERN (gv), got '{func_code}'"

    def test_units_match_metric_type(self, real_client):
        """Target units should be appropriate for the metric type."""
        # Test a percentage metric
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Endpoint Protection Coverage Percentage",
                "framework": "csf_2_0",
            },
        )

        assert response.status_code == 200, f"API error: {response.text}"
        data = response.json()
        assert data.get("success"), f"API returned failure: {data}"
        metric = data.get("metric", {})

        units = metric.get("target_units", "").lower()
        assert units in ["%", "percent", "percentage"], \
            f"Percentage metric should have percentage units, got '{units}'"

        target = metric.get("target_value")
        if target is not None:
            assert 0 <= float(target) <= 100, \
                f"Percentage target should be 0-100, got {target}"


# =============================================================================
# ERROR RECOVERY TESTS
# =============================================================================

class TestAIErrorRecovery:
    """Test that the system handles AI errors gracefully."""

    def test_handles_ambiguous_input_gracefully(self, real_client):
        """Should handle vague/ambiguous requests without crashing."""
        response = real_client.post(
            "/api/v1/ai/chat?framework=csf_2_0",
            json={
                "message": "make it better",
                "mode": "explain",
            },
        )

        # Should not crash - either 200 with clarification or 400 with helpful error
        assert response.status_code in [200, 400], \
            f"Unexpected status {response.status_code}: {response.text}"

        if response.status_code == 200:
            data = response.json()
            # Should have some response (not empty)
            assert data.get("assistant_message"), "Should provide some response"

    def test_handles_invalid_framework_gracefully(self, real_client):
        """Should return helpful error for invalid framework."""
        response = real_client.post(
            "/api/v1/ai/generate-metric",
            params={
                "metric_name": "Track something",
                "framework": "invalid_framework",
            },
        )

        # Should return 400 or 404, not 500
        assert response.status_code in [400, 404, 422], \
            f"Should return 4xx for invalid framework, got {response.status_code}"
