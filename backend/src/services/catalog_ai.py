"""Provider-agnostic AI functions for catalog mapping and enhancement.

Replaces the legacy claude_client-based catalog AI features with
the multi-provider system. These functions accept any BaseAIProvider
and delegate the actual API call to provider.generate_response().
"""

import json
import logging
from typing import Dict, List, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from ..schemas import CatalogMappingSuggestion, CSFFunction
from .claude_client import FRAMEWORK_PROMPTS

logger = logging.getLogger(__name__)


def _clean_json_response(response: str) -> str:
    """Strip markdown code block fences from AI response."""
    cleaned = response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def _get_provider_model(provider) -> str:
    """Get the best model to use from a provider instance."""
    # User's configured model takes priority
    configured = getattr(provider, '_configured_model', None)
    if configured:
        return configured
    # Fall back to provider's default
    default = getattr(provider, '_default_model', None)
    if default:
        return default
    # Last resort
    return provider.get_default_model() if hasattr(provider, 'get_default_model') else "claude-sonnet-4-5-20250929"


async def generate_framework_mappings(
    provider,
    catalog_id: UUID,
    framework: str,
    db: Session,
) -> List[CatalogMappingSuggestion]:
    """Generate framework mapping suggestions for catalog items using AI.

    Args:
        provider: An initialized BaseAIProvider instance
        catalog_id: The catalog to generate mappings for
        framework: Target framework code (csf_2_0, ai_rmf, etc.)
        db: Database session

    Returns:
        List of CatalogMappingSuggestion objects
    """
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

    fw_info = FRAMEWORK_PROMPTS.get(framework, FRAMEWORK_PROMPTS["csf_2_0"])
    framework_context = f"{fw_info['name']}\n{fw_info['functions']}\n{fw_info['categories']}"

    system_prompt = f"""You are a {fw_info.get('name', 'NIST framework')} expert. Map cybersecurity metrics to appropriate framework functions, categories, and subcategories.

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

    user_prompt = f"Map these cybersecurity metrics to {fw_info.get('name', 'the framework')}:\n\n{json.dumps(metrics_context, indent=2)}"

    try:
        model = _get_provider_model(provider)
        logger.info(f"Generating {framework} mappings for {len(items)} metrics using provider model {model}")

        response = await provider.generate_response(
            messages=[{"role": "user", "content": user_prompt}],
            model=model,
            system_prompt=system_prompt,
            max_tokens=8192,
            temperature=0.7,
        )

        # Parse response
        cleaned = _clean_json_response(response.content)

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed for framework mappings: {e}")
            return []

        mappings = []
        for mapping_data in parsed.get("mappings", []):
            try:
                func_str = mapping_data.get("suggested_function", "").lower()

                csf_function = None
                if framework == "csf_2_0":
                    csf_function_map = {
                        "gv": CSFFunction.GOVERN,
                        "id": CSFFunction.IDENTIFY,
                        "pr": CSFFunction.PROTECT,
                        "de": CSFFunction.DETECT,
                        "rs": CSFFunction.RESPOND,
                        "rc": CSFFunction.RECOVER,
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
                    reasoning=mapping_data.get("reasoning"),
                )
                mappings.append(mapping)

            except Exception as e:
                logger.warning(f"Skipping invalid mapping: {e}")
                continue

        logger.info(f"Generated {len(mappings)} framework mapping suggestions")
        return mappings

    except Exception as e:
        logger.error(f"Framework mapping generation failed: {e}")
        return []


async def enhance_catalog_metrics(
    provider,
    catalog_id: UUID,
    framework: str,
    db: Session,
) -> List[Dict[str, Any]]:
    """Generate metric enhancement suggestions using AI.

    Args:
        provider: An initialized BaseAIProvider instance
        catalog_id: The catalog to enhance
        framework: Target framework code
        db: Database session

    Returns:
        List of enhancement suggestion dicts
    """
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
            "current_collection_frequency": item.collection_frequency.value if item.collection_frequency else "",
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
      "suggested_priority": 1,
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

    try:
        model = _get_provider_model(provider)
        logger.info(f"Generating metric enhancements for {len(items)} metrics using provider model {model}")

        response = await provider.generate_response(
            messages=[{"role": "user", "content": user_prompt}],
            model=model,
            system_prompt=system_prompt,
            max_tokens=8192,
            temperature=0.7,
        )

        cleaned = _clean_json_response(response.content)

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed for enhancements: {e}")
            return []

        enhancements = parsed.get("enhancements", [])
        logger.info(f"Generated {len(enhancements)} metric enhancement suggestions")
        return enhancements

    except Exception as e:
        logger.error(f"Metric enhancement generation failed: {e}")
        return []
