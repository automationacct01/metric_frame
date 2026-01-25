"""Anthropic Claude AI provider implementation.

Provides integration with Anthropic's Claude models including:
- Claude Opus 4.5
- Claude Sonnet 4.5
- Claude 3.5 Sonnet
- Claude 3 Haiku
"""
import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

from anthropic import Anthropic, APIError, AuthenticationError as AnthropicAuthError, RateLimitError as AnthropicRateLimitError

from ..base_provider import (
    BaseAIProvider,
    ProviderType,
    AuthType,
    ProviderCredentials,
    AIResponse,
    ModelInfo,
    AuthenticationError,
    RateLimitError,
    ProviderTimeoutError,
    InvalidRequestError,
    ServerError,
)
from ..provider_registry import PROVIDER_REGISTRY, get_models_for_provider

logger = logging.getLogger(__name__)


# Framework-specific prompts (shared with legacy claude_client.py)
FRAMEWORK_PROMPTS = {
    "csf_2_0": {
        "name": "NIST CSF 2.0",
        "functions": """
NIST CSF 2.0 Functions:
- GOVERN (gv): Cybersecurity governance, risk management strategy, policy, oversight
- IDENTIFY (id): Asset management, risk assessment, supply chain risk management
- PROTECT (pr): Access control, awareness training, data security, platform security
- DETECT (de): Continuous monitoring, adverse event analysis
- RESPOND (rs): Incident management, analysis, mitigation, reporting
- RECOVER (rc): Recovery planning, communications during recovery""",
        "categories": """
Key Categories by Function:
- GV: Organizational Context (GV.OC), Risk Management Strategy (GV.RM), Roles/Responsibilities (GV.RR), Policy (GV.PO), Oversight (GV.OV), Cybersecurity Supply Chain (GV.SC)
- ID: Asset Management (ID.AM), Risk Assessment (ID.RA), Improvement (ID.IM)
- PR: Identity Management/Access Control (PR.AA), Awareness/Training (PR.AT), Data Security (PR.DS), Platform Security (PR.PS), Technology Infrastructure (PR.IR)
- DE: Continuous Monitoring (DE.CM), Adverse Event Analysis (DE.AE)
- RS: Incident Management (RS.MA), Incident Analysis (RS.AN), Incident Response Reporting (RS.CO), Incident Mitigation (RS.MI)
- RC: Incident Recovery Plan Execution (RC.RP), Incident Recovery Communication (RC.CO)"""
    },
    "ai_rmf": {
        "name": "NIST AI RMF 1.0",
        "functions": """
NIST AI RMF 1.0 Functions:
- GOVERN: Policies, procedures, accountability structures for AI risk management
- MAP: Understanding AI system context, stakeholders, and potential impacts
- MEASURE: Assessing, analyzing, and tracking AI risks
- MANAGE: Prioritizing, responding to, and recovering from AI risks""",
        "categories": """
Key Categories by Function:
- GOVERN: GOVERN-1 (Policies), GOVERN-2 (Accountability), GOVERN-3 (Workforce), GOVERN-4 (Organizational Culture), GOVERN-5 (Stakeholder Engagement), GOVERN-6 (Legal/Regulatory)
- MAP: MAP-1 (Context), MAP-2 (Categorization), MAP-3 (Benefits/Costs), MAP-4 (Risks), MAP-5 (Impacts)
- MEASURE: MEASURE-1 (Methods), MEASURE-2 (Evaluation), MEASURE-3 (Tracking), MEASURE-4 (Feedback)
- MANAGE: MANAGE-1 (Risk Prioritization), MANAGE-2 (Risk Response), MANAGE-3 (Risk Communication), MANAGE-4 (Documentation)

Trustworthiness Characteristics:
- Valid and Reliable
- Safe
- Secure and Resilient
- Accountable and Transparent
- Explainable and Interpretable
- Privacy-Enhanced
- Fair (with harmful bias managed)"""
    },
    "cyber_ai_profile": {
        "name": "NIST Cyber AI Profile",
        "functions": """
Cyber AI Profile Focus Areas (extends CSF 2.0 for AI systems):
- SECURE: Protect AI systems from adversarial attacks, data poisoning, model theft
- DEFEND: Use AI to enhance cybersecurity detection, response capabilities
- THWART: Counter AI-enabled cyber threats and attacks""",
        "categories": """
Integration with CSF 2.0:
- SECURE maps primarily to PROTECT (PR) and IDENTIFY (ID)
- DEFEND maps primarily to DETECT (DE) and RESPOND (RS)
- THWART maps across all functions with emphasis on threat intelligence"""
    }
}


class AnthropicProvider(BaseAIProvider):
    """Anthropic Claude AI provider.

    Implements the BaseAIProvider interface for Anthropic's Claude models.
    """

    provider_type = ProviderType.ANTHROPIC
    auth_type = AuthType.API_KEY
    supported_models = [
        "claude-opus-4-5-20251101",
        "claude-sonnet-4-5-20250929",
        "claude-3-5-sonnet-20241022",
        "claude-3-haiku-20240307",
    ]

    def __init__(self):
        super().__init__()
        self._client: Optional[Anthropic] = None
        self._default_model = "claude-sonnet-4-5-20250929"

    async def initialize(self, credentials: ProviderCredentials) -> bool:
        """Initialize the Anthropic client with credentials.

        Args:
            credentials: Must contain api_key

        Returns:
            True if initialization succeeded
        """
        if not credentials.api_key:
            logger.error("Anthropic initialization failed: No API key provided")
            return False

        try:
            self._client = Anthropic(api_key=credentials.api_key)
            self._credentials = credentials
            self._initialized = True
            logger.info("Anthropic provider initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Anthropic initialization failed: {e}")
            return False

    async def validate_credentials(self, credentials: ProviderCredentials) -> bool:
        """Validate Anthropic API key by making a minimal API call.

        Args:
            credentials: Credentials to validate

        Returns:
            True if credentials are valid
        """
        if not credentials.api_key:
            return False

        try:
            test_client = Anthropic(api_key=credentials.api_key)
            # Make a minimal API call to validate
            await asyncio.to_thread(
                lambda: test_client.messages.create(
                    model="claude-3-haiku-20240307",  # Use cheapest model for validation
                    messages=[{"role": "user", "content": "Hi"}],
                    max_tokens=10,
                )
            )
            return True
        except AnthropicAuthError:
            logger.warning("Anthropic credential validation failed: Invalid API key")
            return False
        except Exception as e:
            logger.error(f"Anthropic credential validation error: {e}")
            return False

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AIResponse:
        """Generate a response using Claude.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model ID to use
            max_tokens: Maximum response tokens
            temperature: Sampling temperature
            system_prompt: Optional system prompt
            **kwargs: Additional parameters (ignored)

        Returns:
            AIResponse with generated content
        """
        if not self._client:
            raise InvalidRequestError("Provider not initialized", ProviderType.ANTHROPIC)

        # Validate model
        if not self.supports_model(model):
            logger.warning(f"Model {model} not in supported list, using anyway")

        # Extract system message from messages if not provided separately
        if not system_prompt:
            system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
            system_prompt = system_msg

        # Filter out system messages from conversation
        conversation = [m for m in messages if m["role"] != "system"]

        start_time = time.time()

        try:
            response = await asyncio.to_thread(
                lambda: self._client.messages.create(
                    model=model,
                    system=system_prompt,
                    messages=conversation,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            )

            latency_ms = (time.time() - start_time) * 1000

            return AIResponse(
                content=response.content[0].text,
                model_used=model,
                provider=self.provider_type,
                tokens_used={
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens,
                },
                latency_ms=latency_ms,
                finish_reason=response.stop_reason,
                raw_response=response,
            )

        except AnthropicAuthError as e:
            raise AuthenticationError(str(e), ProviderType.ANTHROPIC)
        except AnthropicRateLimitError as e:
            raise RateLimitError(str(e), ProviderType.ANTHROPIC)
        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(str(e), ProviderType.ANTHROPIC)
        except APIError as e:
            if e.status_code and e.status_code >= 500:
                raise ServerError(str(e), ProviderType.ANTHROPIC)
            raise InvalidRequestError(str(e), ProviderType.ANTHROPIC)
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise ServerError(str(e), ProviderType.ANTHROPIC)

    def get_available_models(self) -> List[ModelInfo]:
        """Get available Claude models.

        Returns:
            List of ModelInfo objects
        """
        return get_models_for_provider(ProviderType.ANTHROPIC)

    # =========================================================================
    # Domain-specific methods (cybersecurity metrics)
    # =========================================================================

    def get_framework_context(self, framework: str = "csf_2_0") -> str:
        """Get framework-specific context for prompts."""
        fw = FRAMEWORK_PROMPTS.get(framework, FRAMEWORK_PROMPTS["csf_2_0"])
        return f"{fw['name']}\n{fw['functions']}\n{fw['categories']}"

    def get_metrics_system_prompt(self, framework: str = "csf_2_0") -> str:
        """Get system prompt for metrics mode."""
        framework_context = self.get_framework_context(framework)
        fw_name = FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST frameworks')

        return f"""You are a cybersecurity metrics assistant specializing in {fw_name}.

{framework_context}

When asked to add or modify metrics, respond ONLY with valid JSON matching this schema:

{{
  "assistant_message": "Brief explanation of what you're creating/modifying",
  "actions": [
    {{
      "action": "add_metric",
      "metric": {{
        "name": "Clear, specific metric name",
        "description": "Plain-language definition of what this measures",
        "formula": "Human-readable calculation method",
        "framework": "{framework}",
        "function_code": "function_code (e.g., gv, id, pr, de, rs, rc for CSF)",
        "category_code": "category_code (e.g., GV.OC, ID.AM)",
        "priority_rank": 1|2|3,
        "direction": "higher_is_better|lower_is_better|target_range|binary",
        "target_value": 95.0,
        "target_units": "%|count|days|hours|boolean",
        "owner_function": "GRC|SecOps|IAM|IT Ops|IR|BCP|CISO",
        "collection_frequency": "daily|weekly|monthly|quarterly|ad_hoc",
        "data_source": "Tool or process providing data"
      }}
    }}
  ],
  "needs_confirmation": true
}}

Focus on outcome-based metrics that help communicate risk to executives. Set realistic enterprise targets."""

    def get_explain_system_prompt(self, framework: str = "csf_2_0") -> str:
        """Get system prompt for explain mode."""
        framework_context = self.get_framework_context(framework)
        fw_name = FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST frameworks')

        return f"""You are a cybersecurity metrics expert specializing in {fw_name}.

{framework_context}

Explain metrics, scoring, and risk concepts in clear business language. Focus on:
- What the metric measures and why it matters
- How scores are calculated (gap-to-target methodology)
- Business impact of current performance
- Recommendations for improvement

Use non-technical language suitable for executives and board members."""

    def get_report_system_prompt(self, framework: str = "csf_2_0") -> str:
        """Get system prompt for report mode."""
        framework_context = self.get_framework_context(framework)
        fw_name = FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST framework')

        return f"""Generate executive-ready cybersecurity risk narrative based on {fw_name} function scores.

{framework_context}

Focus on:
- Material gaps to target performance
- Business risk implications
- Key trends (if data available)
- Prioritized improvement areas

Use clear, non-technical language appropriate for CISO briefings to executives and board members.
Keep narrative concise (1-2 paragraphs per function with significant gaps)."""

    def get_recommendations_system_prompt(self, framework: str = "csf_2_0") -> str:
        """Get system prompt for recommendations mode."""
        framework_context = self.get_framework_context(framework)

        return f"""You are a cybersecurity metrics strategist. Based on the current metric coverage and scores, recommend new metrics to improve security posture visibility.

{framework_context}

Analyze gaps in framework coverage and recommend metrics that would:
1. Fill coverage gaps in underrepresented functions/categories
2. Address areas with low scores or missing data
3. Align with industry best practices
4. Support executive decision-making

Respond with JSON:
{{
  "recommendations": [
    {{
      "metric_name": "Recommended metric name",
      "description": "What it measures",
      "function_code": "target_function",
      "category_code": "target_category",
      "priority": 1|2|3,
      "rationale": "Why this metric is recommended",
      "expected_impact": "How this improves security visibility"
    }}
  ],
  "gap_analysis": {{
    "underrepresented_functions": ["list of functions with few metrics"],
    "coverage_percentage": 75.0,
    "overall_assessment": "Summary of current coverage state"
  }}
}}"""

    def get_few_shot_examples(self, framework: str = "csf_2_0") -> List[Dict[str, str]]:
        """Get few-shot examples for metric generation."""
        if framework == "ai_rmf":
            return [
                {
                    "user": "Add a metric for AI model accuracy monitoring",
                    "assistant": json.dumps({
                        "assistant_message": "Creating a MEASURE function metric to track AI model performance validation.",
                        "actions": [{
                            "action": "add_metric",
                            "metric": {
                                "name": "AI Model Accuracy Drift Rate",
                                "description": "Percentage change in model accuracy compared to baseline over time",
                                "formula": "((Current accuracy - Baseline accuracy) / Baseline accuracy) * 100",
                                "framework": "ai_rmf",
                                "function_code": "measure",
                                "category_code": "MEASURE-2",
                                "priority_rank": 1,
                                "direction": "lower_is_better",
                                "target_value": 5.0,
                                "target_units": "%",
                                "owner_function": "AI Ops",
                                "collection_frequency": "weekly",
                                "data_source": "ML monitoring platform"
                            }
                        }],
                        "needs_confirmation": True
                    })
                }
            ]

        # Default CSF 2.0 examples
        return [
            {
                "user": "Add a metric for board cyber briefings",
                "assistant": json.dumps({
                    "assistant_message": "Creating a governance metric to track executive cyber risk communication frequency.",
                    "actions": [{
                        "action": "add_metric",
                        "metric": {
                            "name": "Board Cyber Briefing Frequency",
                            "description": "Number of cybersecurity briefings provided to board of directors per year",
                            "formula": "Count of board presentations with cybersecurity risk content",
                            "framework": "csf_2_0",
                            "function_code": "gv",
                            "category_code": "GV.OV",
                            "priority_rank": 1,
                            "direction": "higher_is_better",
                            "target_value": 4.0,
                            "target_units": "per year",
                            "owner_function": "CISO",
                            "collection_frequency": "quarterly",
                            "data_source": "Executive calendar and meeting minutes"
                        }
                    }],
                    "needs_confirmation": True
                })
            }
        ]

    @staticmethod
    def parse_json_response(response: str) -> Dict[str, Any]:
        """Parse JSON from Claude response, handling markdown code blocks.

        Args:
            response: Raw response text

        Returns:
            Parsed JSON dict
        """
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        return json.loads(cleaned)
