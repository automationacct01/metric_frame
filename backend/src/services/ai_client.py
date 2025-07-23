"""AI client service for OpenAI and Anthropic integration."""

import os
import json
from typing import Dict, List, Optional, Any
from uuid import UUID
from openai import OpenAI
from anthropic import Anthropic
from sqlalchemy.orm import Session

from ..schemas import CSFFunction, MetricDirection, CollectionFrequency, CatalogMappingSuggestion


class AIClient:
    """Unified AI client for metrics assistance."""
    
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("AI_MODEL", "gpt-4o-mini")
        
        self.openai_client = OpenAI(api_key=self.openai_key) if self.openai_key else None
        self.anthropic_client = Anthropic(api_key=self.anthropic_key) if self.anthropic_key else None
    
    def is_available(self) -> bool:
        """Check if AI service is available."""
        return bool(self.openai_client or self.anthropic_client)
    
    def _get_system_prompt(self, mode: str = "metrics") -> str:
        """Get system prompt based on mode."""
        
        if mode == "metrics":
            return """You are a cybersecurity metrics assistant specializing in NIST CSF 2.0 Key Risk Indicators.

NIST CSF 2.0 Functions:
- GOVERN (gv): Cybersecurity governance, risk management, policy
- IDENTIFY (id): Asset management, risk assessment, vulnerability management  
- PROTECT (pr): Access control, data security, protective technology
- DETECT (de): Anomaly detection, continuous monitoring
- RESPOND (rs): Incident response, communications, analysis
- RECOVER (rc): Recovery planning, business continuity

When asked to add or modify metrics, respond ONLY with valid JSON matching this schema:

{
  "assistant_message": "Brief explanation of what you're creating/modifying",
  "actions": [
    {
      "action": "add_metric",
      "metric": {
        "name": "Clear, specific metric name",
        "description": "Plain-language definition of what this measures",
        "formula": "Human-readable calculation method",
        "csf_function": "gv|id|pr|de|rs|rc",
        "priority_rank": 1|2|3,
        "direction": "higher_is_better|lower_is_better|target_range|binary",
        "target_value": 95.0,
        "target_units": "%|count|days|hours|boolean",
        "owner_function": "GRC|SecOps|IAM|IT Ops|IR|BCP|CISO",
        "collection_frequency": "daily|weekly|monthly|quarterly|ad_hoc",
        "data_source": "Tool or process providing data"
      }
    }
  ],
  "needs_confirmation": true
}

Focus on outcome-based metrics that help communicate risk to executives. Examples:
- Policy Compliance Rate (Govern)
- Asset Inventory Accuracy (Identify) 
- MFA Coverage for Privileged Accounts (Protect)
- Mean Time to Detect (Detect)
- Mean Time to Respond (Respond)
- Backup Restore Success Rate (Recover)

Set realistic enterprise targets (e.g., 95% compliance, 24hr detection/response)."""

        elif mode == "explain":
            return """You are a cybersecurity metrics expert. Explain metrics, scoring, and risk concepts in clear business language. Focus on:
- What the metric measures and why it matters
- How scores are calculated (gap-to-target methodology)
- Business impact of current performance
- Recommendations for improvement

Use non-technical language suitable for executives and board members."""

        elif mode == "report":
            return """Generate executive-ready cybersecurity risk narrative based on NIST CSF 2.0 function scores.

Focus on:
- Material gaps to target performance
- Business risk implications  
- Key trends (if data available)
- Prioritized improvement areas

Use clear, non-technical language appropriate for CISO briefings to executives and board members.
Keep narrative concise (1-2 paragraphs per function with significant gaps)."""

        return "You are a helpful cybersecurity assistant."
    
    def _get_few_shot_examples(self) -> List[Dict[str, str]]:
        """Get few-shot examples for metric generation."""
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
                            "csf_function": "gv",
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
                            "csf_function": "pr",
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
            },
            {
                "user": "Add metric for incident response time",
                "assistant": json.dumps({
                    "assistant_message": "Creating a response metric to track how quickly security incidents are contained.",
                    "actions": [{
                        "action": "add_metric",
                        "metric": {
                            "name": "Mean Time to Respond (MTTR)",
                            "description": "Average time from incident detection to initial containment action",
                            "formula": "Sum of (containment time - detection time) / Number of incidents",
                            "csf_function": "rs",
                            "priority_rank": 1,
                            "direction": "lower_is_better",
                            "target_value": 24.0,
                            "target_units": "hours",
                            "owner_function": "IR",
                            "collection_frequency": "monthly",
                            "data_source": "Incident response ticketing system"
                        }
                    }],
                    "needs_confirmation": True
                })
            }
        ]
    
    async def generate_response(
        self, 
        message: str, 
        mode: str = "metrics",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate AI response based on user message and mode."""
        
        if not self.is_available():
            raise Exception("AI service not configured - missing API keys")
        
        system_prompt = self._get_system_prompt(mode)
        
        # Build messages for conversation
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add few-shot examples for metrics mode
        if mode == "metrics":
            examples = self._get_few_shot_examples()
            for example in examples:
                messages.append({"role": "user", "content": example["user"]})
                messages.append({"role": "assistant", "content": example["assistant"]})
        
        # Add context if provided (existing metrics, scores, etc.)
        if context and mode != "metrics":
            context_str = f"Current context: {json.dumps(context, indent=2)}"
            messages.append({"role": "user", "content": context_str})
        
        # Add user message
        messages.append({"role": "user", "content": message})
        
        # Call appropriate AI service
        try:
            if self.model.startswith("gpt") and self.openai_client:
                response = await self._call_openai(messages, mode)
            elif self.model.startswith("claude") and self.anthropic_client:
                response = await self._call_anthropic(messages, mode)
            else:
                # Fallback to available service
                if self.openai_client:
                    response = await self._call_openai(messages, mode)
                elif self.anthropic_client:
                    response = await self._call_anthropic(messages, mode)
                else:
                    raise Exception("No AI service available")
            
            return self._parse_response(response, mode)
            
        except Exception as e:
            raise Exception(f"AI service error: {str(e)}")
    
    async def _call_openai(self, messages: List[Dict], mode: str) -> str:
        """Call OpenAI API."""
        response = self.openai_client.chat.completions.create(
            model=self.model if self.model.startswith("gpt") else "gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    
    async def _call_anthropic(self, messages: List[Dict], mode: str) -> str:
        """Call Anthropic API."""
        # Convert messages format for Anthropic
        system_message = next((m["content"] for m in messages if m["role"] == "system"), "")
        conversation = [m for m in messages if m["role"] != "system"]
        
        response = self.anthropic_client.messages.create(
            model=self.model if self.model.startswith("claude") else "claude-3-5-sonnet-20241022",
            system=system_message,
            messages=conversation,
            max_tokens=1500,
            temperature=0.7,
        )
        return response.content[0].text
    
    def _parse_response(self, response: str, mode: str) -> Dict[str, Any]:
        """Parse AI response based on mode."""
        
        if mode == "metrics":
            # Try to parse JSON response
            try:
                parsed = json.loads(response)
                if self._validate_metrics_response(parsed):
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
            # Check required top-level fields
            if not all(key in response for key in ["assistant_message", "actions", "needs_confirmation"]):
                return False
            
            # Validate actions
            for action in response.get("actions", []):
                if action.get("action") not in ["add_metric", "update_metric", "delete_metric"]:
                    return False
                
                if action.get("action") == "add_metric":
                    metric = action.get("metric", {})
                    required_fields = ["name", "csf_function", "direction"]
                    if not all(field in metric for field in required_fields):
                        return False
                    
                    # Validate enums
                    if metric.get("csf_function") not in ["gv", "id", "pr", "de", "rs", "rc"]:
                        return False
                    
                    if metric.get("direction") not in ["higher_is_better", "lower_is_better", "target_range", "binary"]:
                        return False
            
            return True
            
        except Exception:
            return False


    async def generate_csf_mappings(
        self,
        catalog_id: UUID,
        db: Session
    ) -> List[CatalogMappingSuggestion]:
        """Generate CSF mapping suggestions for catalog items using AI."""
        
        from ..models import MetricCatalogItem
        
        # Get catalog items that need mapping
        items = db.query(MetricCatalogItem).filter(
            MetricCatalogItem.catalog_id == catalog_id
        ).all()
        
        if not items:
            return []
        
        # Prepare context for AI
        metrics_context = []
        for item in items:
            metrics_context.append({
                "id": str(item.id),
                "name": item.name,
                "description": item.description or "",
                "formula": item.formula or "",
                "direction": item.direction.value,
                "owner_function": item.owner_function or "",
                "data_source": item.data_source or ""
            })
        
        # Build AI prompt for CSF mapping
        system_prompt = """You are a NIST CSF 2.0 expert. Map cybersecurity metrics to appropriate CSF functions and categories.

NIST CSF 2.0 Functions and Categories:
- GOVERN (gv): GV.OC (Oversight & Control), GV.RM (Risk Management), GV.SC (Supply Chain), GV.PO (Policy), GV.OV (Oversight)
- IDENTIFY (id): ID.AM (Asset Management), ID.RA (Risk Assessment), ID.IM (Improvement), ID.GV (Governance)
- PROTECT (pr): PR.AA (Access Control), PR.AT (Awareness), PR.DS (Data Security), PR.IP (Information Protection), PR.MA (Maintenance), PR.PT (Protective Technology)
- DETECT (de): DE.AE (Anomalies and Events), DE.CM (Continuous Monitoring), DE.DP (Detection Processes)
- RESPOND (rs): RS.RP (Response Planning), RS.CO (Communications), RS.AN (Analysis), RS.MI (Mitigation), RS.IM (Improvements)
- RECOVER (rc): RC.RP (Recovery Planning), RC.IM (Improvements), RC.CO (Communications)

Respond with JSON mapping each metric to its best CSF function with confidence score:

{
  "mappings": [
    {
      "catalog_item_id": "uuid",
      "metric_name": "string",
      "suggested_function": "gv|id|pr|de|rs|rc",
      "suggested_category": "category_code",
      "suggested_subcategory": "subcategory_code",
      "confidence_score": 0.8,
      "reasoning": "Brief explanation"
    }
  ]
}

Focus on the metric's primary purpose and main data source to determine the best fit."""
        
        user_prompt = f"Map these cybersecurity metrics to NIST CSF 2.0 functions:\n\n{json.dumps(metrics_context, indent=2)}"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            # Call AI service
            if self.model.startswith("gpt") and self.openai_client:
                response = await self._call_openai(messages, "mapping")
            elif self.model.startswith("claude") and self.anthropic_client:
                response = await self._call_anthropic(messages, "mapping")
            else:
                if self.openai_client:
                    response = await self._call_openai(messages, "mapping")
                else:
                    raise Exception("No AI service available")
            
            # Parse response
            parsed_response = json.loads(response)
            mappings = []
            
            for mapping_data in parsed_response.get("mappings", []):
                try:
                    # Convert function string to enum
                    func_str = mapping_data.get("suggested_function", "").lower()
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
                        suggested_function=csf_function,
                        suggested_category=mapping_data.get("suggested_category"),
                        suggested_subcategory=mapping_data.get("suggested_subcategory"),
                        confidence_score=float(mapping_data.get("confidence_score", 0.5)),
                        reasoning=mapping_data.get("reasoning")
                    )
                    mappings.append(mapping)
                
                except Exception as e:
                    # Skip invalid mappings
                    continue
            
            return mappings
            
        except Exception as e:
            # Return empty list if AI mapping fails
            return []


# Global AI client instance
ai_client = AIClient()


async def generate_csf_mapping_suggestions(catalog_id: UUID, db: Session) -> List[CatalogMappingSuggestion]:
    """Generate CSF mapping suggestions for a catalog."""
    return await ai_client.generate_csf_mappings(catalog_id, db)