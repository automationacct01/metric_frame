"""Claude-only AI client service for multi-framework metrics assistance.

This service uses Claude Sonnet 4.5 exclusively for AI-powered features:
- Metric generation and recommendations
- Framework mapping (CSF 2.0, AI RMF)
- Risk explanations and executive reporting
- Metric enhancement suggestions
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from uuid import UUID
from anthropic import Anthropic
from sqlalchemy.orm import Session

from ..schemas import CSFFunction, MetricDirection, CollectionFrequency, CatalogMappingSuggestion


# Framework-specific prompts
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


class ClaudeClient:
    """Claude-only AI client for multi-framework cybersecurity metrics."""

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

        print(f"Claude Client Initialization:")
        print(f"   - CLAUDE_MODEL: {self.model}")
        print(f"   - ANTHROPIC_API_KEY: {'Set (' + str(len(self.api_key)) + ' chars)' if self.api_key else 'Not set'}")

        self.client = Anthropic(api_key=self.api_key) if self.api_key else None

        if self.client:
            print("Anthropic Claude client initialized successfully")
        else:
            print("Claude client NOT initialized - missing API key")

    def is_available(self) -> bool:
        """Check if Claude service is available."""
        return bool(self.client)

    def _get_framework_context(self, framework: str = "csf_2_0") -> str:
        """Get framework-specific context for prompts."""
        fw = FRAMEWORK_PROMPTS.get(framework, FRAMEWORK_PROMPTS["csf_2_0"])
        return f"{fw['name']}\n{fw['functions']}\n{fw['categories']}"

    def _get_system_prompt(self, mode: str = "metrics", framework: str = "csf_2_0") -> str:
        """Get system prompt based on mode and framework."""

        framework_context = self._get_framework_context(framework)

        if mode == "metrics":
            return f"""You are a cybersecurity metrics assistant specializing in {FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST frameworks')}.

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

        elif mode == "explain":
            return f"""You are a cybersecurity metrics expert specializing in {FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST frameworks')}.

{framework_context}

Explain metrics, scoring, and risk concepts in clear business language. Focus on:
- What the metric measures and why it matters
- How scores are calculated (gap-to-target methodology)
- Business impact of current performance
- Recommendations for improvement

Use non-technical language suitable for executives and board members."""

        elif mode == "report":
            return f"""Generate executive-ready cybersecurity risk narrative based on {FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST framework')} function scores.

{framework_context}

Focus on:
- Material gaps to target performance
- Business risk implications
- Key trends (if data available)
- Prioritized improvement areas

Use clear, non-technical language appropriate for CISO briefings to executives and board members.
Keep narrative concise (1-2 paragraphs per function with significant gaps)."""

        elif mode == "recommendations":
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

        return "You are a helpful cybersecurity assistant."

    def _get_few_shot_examples(self, framework: str = "csf_2_0") -> List[Dict[str, str]]:
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
            },
            {
                "user": "We need to track MFA deployment",
                "assistant": json.dumps({
                    "assistant_message": "Creating a protection metric to measure multi-factor authentication coverage for privileged accounts.",
                    "actions": [{
                        "action": "add_metric",
                        "metric": {
                            "name": "MFA Coverage (Privileged Accounts)",
                            "description": "Percentage of privileged user accounts protected with multi-factor authentication",
                            "formula": "Privileged accounts with MFA / Total privileged accounts * 100",
                            "framework": "csf_2_0",
                            "function_code": "pr",
                            "category_code": "PR.AA",
                            "priority_rank": 1,
                            "direction": "higher_is_better",
                            "target_value": 100.0,
                            "target_units": "%",
                            "owner_function": "IAM",
                            "collection_frequency": "weekly",
                            "data_source": "Identity management system reports"
                        }
                    }],
                    "needs_confirmation": True
                })
            }
        ]

    async def _call_claude(self, messages: List[Dict], mode: str, max_tokens: int = 4096) -> str:
        """Call Claude API."""
        try:
            # Extract system message and conversation
            system_message = next((m["content"] for m in messages if m["role"] == "system"), "")
            conversation = [m for m in messages if m["role"] != "system"]

            print(f"Calling Claude ({self.model}) - Mode: {mode}, Messages: {len(conversation)}")

            response = await asyncio.to_thread(
                lambda: self.client.messages.create(
                    model=self.model,
                    system=system_message,
                    messages=conversation,
                    max_tokens=max_tokens,
                    temperature=0.7,
                )
            )

            content = response.content[0].text
            print(f"Claude response received - Length: {len(content) if content else 0} characters")
            return content

        except Exception as e:
            print(f"Claude API call failed: {str(e)}")
            raise Exception(f"Claude API call failed: {str(e)}")

    async def generate_response(
        self,
        message: str,
        mode: str = "metrics",
        framework: str = "csf_2_0",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate AI response based on user message, mode, and framework."""

        if not self.is_available():
            raise Exception("Claude service not configured - missing API key")

        system_prompt = self._get_system_prompt(mode, framework)

        # Build messages for conversation
        messages = [{"role": "system", "content": system_prompt}]

        # Add few-shot examples for metrics mode
        if mode == "metrics":
            examples = self._get_few_shot_examples(framework)
            for example in examples:
                messages.append({"role": "user", "content": example["user"]})
                messages.append({"role": "assistant", "content": example["assistant"]})

        # Add context if provided (existing metrics, scores, etc.)
        if context:
            context_str = f"Current context:\n{json.dumps(context, indent=2)}"
            messages.append({"role": "user", "content": context_str})

        # Add user message
        messages.append({"role": "user", "content": message})

        try:
            response = await self._call_claude(messages, mode)
            return self._parse_response(response, mode)
        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")

    def _parse_response(self, response: str, mode: str) -> Dict[str, Any]:
        """Parse AI response based on mode."""

        if mode in ["metrics", "recommendations"]:
            # Try to parse JSON response
            try:
                # Clean response - remove markdown code blocks if present
                cleaned = response.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

                parsed = json.loads(cleaned)

                if mode == "metrics" and self._validate_metrics_response(parsed):
                    return parsed
                elif mode == "recommendations":
                    return parsed
                else:
                    return {
                        "assistant_message": "I generated a response, but it doesn't match the expected format. Please try rephrasing your request.",
                        "actions": [],
                        "needs_confirmation": True,
                        "error": "Invalid response format"
                    }
            except json.JSONDecodeError:
                return {
                    "assistant_message": "I had trouble formatting my response. Please try rephrasing your request.",
                    "actions": [],
                    "needs_confirmation": True,
                    "error": "JSON parsing failed"
                }
        else:
            # For explain/report modes, return plain text response
            return {
                "assistant_message": response,
                "actions": [],
                "needs_confirmation": False
            }

    def _validate_metrics_response(self, response: Dict[str, Any]) -> bool:
        """Validate metrics response structure."""
        try:
            if not all(key in response for key in ["assistant_message", "actions", "needs_confirmation"]):
                return False

            for action in response.get("actions", []):
                if action.get("action") not in ["add_metric", "update_metric", "delete_metric"]:
                    return False

                if action.get("action") == "add_metric":
                    metric = action.get("metric", {})
                    required_fields = ["name", "direction"]
                    if not all(field in metric for field in required_fields):
                        return False

            return True
        except Exception:
            return False

    async def generate_framework_mappings(
        self,
        catalog_id: UUID,
        framework: str,
        db: Session
    ) -> List[CatalogMappingSuggestion]:
        """Generate framework mapping suggestions for catalog items using Claude."""

        from ..models import MetricCatalogItem

        items = db.query(MetricCatalogItem).filter(
            MetricCatalogItem.catalog_id == catalog_id
        ).all()

        if not items:
            return []

        # Prepare context
        metrics_context = []
        for item in items:
            metrics_context.append({
                "id": str(item.id),
                "name": item.name,
                "description": item.description or "",
                "formula": item.formula or "",
                "direction": item.direction.value if item.direction else "higher_is_better",
                "owner_function": item.owner_function or "",
                "data_source": item.data_source or ""
            })

        framework_context = self._get_framework_context(framework)

        system_prompt = f"""You are a {FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'NIST framework')} expert. Map cybersecurity metrics to appropriate framework functions, categories, and subcategories.

{framework_context}

VALID CSF 2.0 SUBCATEGORY CODES (use ONLY these - CSF 1.1 codes like PR.AC, PR.IP do NOT exist):
- PR.AA-01 through PR.AA-06 (Identity Management and Access Control - includes network segmentation, access permissions)
- PR.AT-01, PR.AT-02 (Awareness and Training)
- PR.DS-01 through PR.DS-11 (Data Security)
- PR.PS-01 through PR.PS-06 (Platform Security - firewall config, hardware/software maintenance)
- PR.IR-01, PR.IR-02 (Technology Infrastructure Resilience)
- DE.CM-01 through DE.CM-09 (Continuous Monitoring)
- DE.AE-01 through DE.AE-08 (Adverse Event Analysis)
- RS.MA-01 through RS.MA-05 (Incident Management)
- RS.AN-01 through RS.AN-08 (Incident Analysis)
- RS.CO-01 through RS.CO-03 (Incident Response Reporting)
- RS.MI-01, RS.MI-02 (Incident Mitigation)
- RC.RP-01 through RC.RP-06 (Recovery Plan Execution)
- RC.CO-01 through RC.CO-04 (Recovery Communication)
- GV.OC-01 through GV.OC-05 (Organizational Context)
- GV.RM-01 through GV.RM-07 (Risk Management Strategy)
- GV.RR-01 through GV.RR-04 (Roles, Responsibilities, Authorities)
- GV.PO-01, GV.PO-02 (Policy)
- GV.OV-01 through GV.OV-03 (Oversight)
- GV.SC-01 through GV.SC-10 (Cybersecurity Supply Chain Risk Management)
- ID.AM-01 through ID.AM-08 (Asset Management)
- ID.RA-01 through ID.RA-10 (Risk Assessment)
- ID.IM-01 through ID.IM-04 (Improvement)

IMPORTANT: Do NOT use CSF 1.1 codes (PR.AC, PR.IP, DE.DP, etc.) - they do not exist in CSF 2.0.
- Network segmentation/access control -> use PR.AA-05 (access permissions and authorizations)
- Firewall configuration -> use PR.PS-01 (configuration management)

Respond with JSON mapping each metric to its best framework function, category, AND subcategory with confidence score:

{{
  "mappings": [
    {{
      "catalog_item_id": "uuid",
      "metric_name": "string",
      "suggested_function": "function_code (e.g., pr, de, rs)",
      "suggested_category": "category_code (e.g., PR.AA, DE.CM)",
      "suggested_subcategory": "subcategory_code (e.g., PR.AA-01, DE.CM-04) - ALWAYS provide when possible",
      "confidence_score": 0.8,
      "reasoning": "Brief explanation including why this subcategory was chosen"
    }}
  ]
}}

IMPORTANT: Always provide suggested_subcategory - choose the most specific subcategory that fits the metric's purpose.
Focus on the metric's primary purpose and main data source to determine the best fit."""

        user_prompt = f"Map these cybersecurity metrics to {FRAMEWORK_PROMPTS.get(framework, {}).get('name', 'the framework')}:\n\n{json.dumps(metrics_context, indent=2)}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            print(f"Generating {framework} mappings for {len(items)} metrics using Claude")

            response = await self._call_claude(messages, "mapping", max_tokens=8192)

            # Clean and parse response
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError as e:
                print(f"JSON parsing failed: {str(e)}")
                return []

            mappings = []
            for mapping_data in parsed.get("mappings", []):
                try:
                    # Convert function string to enum (for CSF 2.0)
                    func_str = mapping_data.get("suggested_function", "").lower()

                    csf_function = None
                    if framework == "csf_2_0":
                        csf_function_map = {
                            "gv": CSFFunction.GOVERN,
                            "id": CSFFunction.IDENTIFY,
                            "pr": CSFFunction.PROTECT,
                            "de": CSFFunction.DETECT,
                            "rs": CSFFunction.RESPOND,
                            "rc": CSFFunction.RECOVER
                        }
                        csf_function = csf_function_map.get(func_str)
                        if not csf_function:
                            continue

                    mapping = CatalogMappingSuggestion(
                        catalog_item_id=UUID(mapping_data["catalog_item_id"]),
                        metric_name=mapping_data["metric_name"],
                        suggested_function=csf_function if csf_function else CSFFunction.GOVERN,
                        suggested_category=mapping_data.get("suggested_category"),
                        suggested_subcategory=mapping_data.get("suggested_subcategory"),
                        confidence_score=float(mapping_data.get("confidence_score", 0.5)),
                        reasoning=mapping_data.get("reasoning")
                    )
                    mappings.append(mapping)

                except Exception as e:
                    print(f"Skipping invalid mapping: {str(e)}")
                    continue

            print(f"Generated {len(mappings)} framework mapping suggestions")
            return mappings

        except Exception as e:
            print(f"Framework mapping generation failed: {str(e)}")
            return []

    async def enhance_catalog_metrics(
        self,
        catalog_id: UUID,
        framework: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """Generate metric enhancement suggestions using Claude."""

        from ..models import MetricCatalogItem

        items = db.query(MetricCatalogItem).filter(
            MetricCatalogItem.catalog_id == catalog_id
        ).all()

        if not items:
            return []

        metrics_context = []
        for item in items:
            metrics_context.append({
                "id": str(item.id),
                "name": item.name,
                "description": item.description or "",
                "formula": item.formula or "",
                "direction": item.direction.value if item.direction else "higher_is_better",
                "target_value": float(item.target_value) if item.target_value else None,
                "target_units": item.target_units or "",
                "current_data_source": item.data_source or "",
                "current_owner_function": item.owner_function or "",
                "current_collection_frequency": item.collection_frequency.value if item.collection_frequency else ""
            })

        system_prompt = """You are a cybersecurity metrics expert. Analyze each metric and suggest optimal configurations AND documentation for enterprise environments.

OWNER FUNCTIONS (choose the most appropriate):
- GRC: Governance, Risk, and Compliance team
- SecOps: Security Operations team
- IAM: Identity and Access Management team
- IT Ops: IT Operations team
- IR: Incident Response team
- BCP: Business Continuity Planning team
- CISO: Chief Information Security Officer office
- AI Ops: AI/ML Operations team (for AI RMF metrics)

PRIORITY LEVELS:
- 1 (High): Critical business metrics, regulatory compliance, major risk indicators
- 2 (Medium): Important operational metrics, performance tracking
- 3 (Low): Nice-to-have metrics, secondary indicators

COLLECTION FREQUENCIES:
- daily: Real-time operational metrics, security monitoring
- weekly: Regular performance reviews, trend analysis
- monthly: Management reporting, compliance metrics
- quarterly: Strategic reviews, board reporting
- ad_hoc: Event-driven or special assessment metrics

FORMULA GUIDELINES:
- Use clear mathematical notation as ratios (e.g., "detected / total" for percentage metrics)
- IMPORTANT: Do NOT include "* 100" or "x 100" in formulas - the system automatically handles percentage display
- For percentage metrics, just use the ratio: "numerator / denominator" (not "(numerator / denominator) * 100")
- Reference metric variables like current_value, target_value where appropriate
- Keep formulas concise but complete

RISK DEFINITION GUIDELINES:
- Explain what cybersecurity risk this metric measures
- Keep to 1-2 sentences
- Focus on the security implication, not just the measurement
- Avoid citing specific statistics or percentages

BUSINESS IMPACT GUIDELINES:
- Describe the business consequence of poor performance on this metric
- Include potential impacts like financial loss, reputation damage, compliance penalties, operational disruption
- IMPORTANT: Do NOT include specific statistics, dollar amounts, percentages, or time frames (e.g., avoid "$4.5M", "60% of breaches", "16 days")
- Keep descriptions general and qualitative (e.g., "significant financial losses" not "$3.86M average cost")
- Keep to 1-2 sentences

Respond with JSON suggesting enhancements:

{
  "enhancements": [
    {
      "catalog_item_id": "uuid",
      "metric_name": "string",
      "suggested_priority": 1|2|3,
      "suggested_owner_function": "owner",
      "suggested_data_source": "specific tool/system",
      "suggested_collection_frequency": "frequency",
      "suggested_formula": "calculation formula",
      "suggested_risk_definition": "what risk this measures",
      "suggested_business_impact": "business consequence of poor performance",
      "reasoning": "Brief explanation"
    }
  ]
}"""

        user_prompt = f"Suggest optimal configurations for these cybersecurity metrics:\n\n{json.dumps(metrics_context, indent=2)}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            print(f"Generating metric enhancements for {len(items)} metrics")

            response = await self._call_claude(messages, "enhancement", max_tokens=8192)

            # Clean and parse
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError as e:
                print(f"JSON parsing failed: {str(e)}")
                return []

            enhancements = parsed.get("enhancements", [])
            print(f"Generated {len(enhancements)} metric enhancement suggestions")
            return enhancements

        except Exception as e:
            print(f"Metric enhancement generation failed: {str(e)}")
            return []

    async def generate_metric_recommendations(
        self,
        framework: str,
        current_metrics: List[Dict[str, Any]],
        current_scores: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate recommendations for new metrics based on framework coverage gaps."""

        if not self.is_available():
            raise Exception("Claude service not configured")

        system_prompt = self._get_system_prompt("recommendations", framework)

        context = {
            "framework": framework,
            "current_metric_count": len(current_metrics),
            "metrics_by_function": {},
            "current_scores": current_scores or {}
        }

        # Summarize current metrics by function
        for metric in current_metrics:
            func = metric.get("function_code", metric.get("csf_function", "unknown"))
            if func not in context["metrics_by_function"]:
                context["metrics_by_function"][func] = 0
            context["metrics_by_function"][func] += 1

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Current metrics overview:\n{json.dumps(context, indent=2)}\n\nRecommend new metrics to improve coverage."}
        ]

        try:
            response = await self._call_claude(messages, "recommendations")
            return self._parse_response(response, "recommendations")
        except Exception as e:
            raise Exception(f"Recommendation generation failed: {str(e)}")


# Global Claude client instance
claude_client = ClaudeClient()


# Convenience functions for backward compatibility
async def generate_csf_mapping_suggestions(catalog_id: UUID, db: Session) -> List[CatalogMappingSuggestion]:
    """Generate CSF mapping suggestions for a catalog (backward compatible)."""
    return await claude_client.generate_framework_mappings(catalog_id, "csf_2_0", db)


async def generate_metric_enhancement_suggestions(catalog_id: UUID, db: Session) -> List[Dict[str, Any]]:
    """Generate metric enhancement suggestions for a catalog (backward compatible)."""
    return await claude_client.enhance_catalog_metrics(catalog_id, "csf_2_0", db)


async def generate_ai_response(
    message: str,
    mode: str = "metrics",
    framework: str = "csf_2_0",
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generate AI response using Claude."""
    return await claude_client.generate_response(message, mode, framework, context)
