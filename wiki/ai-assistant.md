# AI Assistant

> **Last Updated:** January 2026
> **Status:** Active Development

---

Cyber Metrics Flow integrates AI capabilities powered by Anthropic Claude to assist with metrics creation, analysis, recommendations, and catalog management.

## AI Integration Overview

The AI assistant enhances the application with intelligent automation:

| Capability | Description |
|------------|-------------|
| **Metric Generation** | Create metrics from natural language |
| **Risk Explanation** | Plain-language risk analysis |
| **Executive Reports** | Generate summary reports |
| **CSF Mapping** | Automatic framework alignment |
| **Enhancement Suggestions** | Improve imported metrics |
| **Recommendations** | Prioritized improvement actions |

### AI Configuration

Configure AI in `backend/.env`:

```env
# Primary AI Provider
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Fallback Provider (optional)
OPENAI_API_KEY=sk-your-key-here

# AI Settings
AI_TIMEOUT=30
AI_MAX_RETRIES=3
```

## Chat Interface

Access the AI assistant via the chat panel:

```
┌─────────────────────────────────────────────────────────────┐
│  AI ASSISTANT                                     [Mode ▼]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🤖 Hello! I can help you with:                         │ │
│  │    • Creating new metrics                              │ │
│  │    • Explaining risk scores                            │ │
│  │    • Generating reports                                │ │
│  │    • Mapping metrics to frameworks                     │ │
│  │    • Suggesting improvements                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 👤 Create a metric for tracking phishing test results  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🤖 I'll create a phishing awareness metric:            │ │
│  │                                                         │ │
│  │    Name: Phishing Test Click Rate                      │ │
│  │    Description: Percentage of employees who            │ │
│  │                 click on simulated phishing links      │ │
│  │    Target: 5%                                          │ │
│  │    Direction: lower_is_better                          │ │
│  │    CSF Function: PROTECT                               │ │
│  │    CSF Category: PR.AT (Awareness & Training)          │ │
│  │    Priority: High                                      │ │
│  │                                                         │ │
│  │    [Create Metric] [Modify] [Cancel]                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [Type your message...                              ] [Send] │
└─────────────────────────────────────────────────────────────┘
```

## Chat Modes

The AI operates in specialized modes:

### Metrics Mode

**Purpose:** Create and modify metrics

**Trigger:** Default mode or "create metric", "add metric"

**Example Prompts:**
- "Create a metric for endpoint detection coverage"
- "Add a KRI for measuring backup success rate"
- "I need to track mean time to contain incidents"

**Output:** Structured metric ready for creation

### Explain Mode

**Purpose:** Interpret risk scores and data

**Trigger:** "explain", "why", "what does this mean"

**Example Prompts:**
- "Explain why IDENTIFY has a low score"
- "What's causing the elevated risk in DETECT?"
- "Why did our overall score drop this month?"

**Output:** Plain-language analysis with context

### Report Mode

**Purpose:** Generate executive summaries

**Trigger:** "report", "summary", "brief"

**Example Prompts:**
- "Generate a board-level security summary"
- "Create a monthly risk report"
- "Summarize our PROTECT function status"

**Output:** Formatted report with key findings

### Recommendations Mode

**Purpose:** Suggest improvement actions

**Trigger:** "recommend", "suggest", "how can we improve"

**Example Prompts:**
- "What should we prioritize to improve our score?"
- "Recommend actions for the RESPOND function"
- "Suggest quick wins for our security posture"

**Output:** Prioritized action items with impact estimates

### Enhance Mode

**Purpose:** Improve imported metrics

**Trigger:** "enhance", "improve", "optimize"

**Example Prompts:**
- "Enhance these imported metrics"
- "Improve the descriptions for my catalog"
- "Suggest better targets for these KRIs"

**Output:** Enhancement suggestions per metric

## Metric Generation

### Natural Language to Structure

The AI converts descriptions into complete metric definitions:

**Input:**
> "We need to track how many of our servers get patched within 7 days of critical vulnerabilities being announced"

**Output:**
```json
{
  "name": "Critical Patch Compliance Rate",
  "description": "Percentage of servers patched within 7 days of critical vulnerability disclosure",
  "current_value": null,
  "target_value": 95,
  "unit": "%",
  "direction": "higher_is_better",
  "csf_function": "PROTECT",
  "csf_category": "PR.PS",
  "priority": "High",
  "suggested_data_sources": [
    "Vulnerability scanner",
    "Patch management system",
    "CMDB"
  ]
}
```

### Metric Generation Workflow

```
User Input (natural language)
         │
         ▼
┌────────────────────────────┐
│  AI Processing              │
│  1. Parse intent            │
│  2. Identify metric type    │
│  3. Determine direction     │
│  4. Map to CSF category     │
│  5. Set reasonable target   │
│  6. Assign priority         │
└────────────────────────────┘
         │
         ▼
Preview metric structure
         │
         ▼
User confirms or modifies
         │
         ▼
Metric created in database
```

### Multi-Metric Generation

Generate related metrics at once:

**Input:**
> "Create a set of metrics for our incident response capability"

**Output:**
Multiple metrics covering:
- Mean Time to Detect (MTTD)
- Mean Time to Respond (MTTR)
- Mean Time to Contain (MTTC)
- Incident documentation rate
- Post-incident review completion

## CSF Mapping Suggestions

### Automatic Category Assignment

When importing metrics or creating new ones, AI suggests framework mappings:

**Input Metric:**
> "Privileged Access Review Frequency"

**AI Analysis:**
```
Analyzing metric characteristics:
- "Privileged Access" → Access Control domain
- "Review" → Verification/audit process
- "Frequency" → Periodic activity

Suggested Mapping:
  Function: PROTECT (PR)
  Category: PR.AA (Identity Management, Authentication, and Access Control)
  Subcategory: PR.AA-05 (Access permissions managed)
  Confidence: 92%

Alternative Mappings:
  - GV.OV (Oversight) - 45% confidence
  - ID.AM (Asset Management) - 38% confidence
```

### Mapping Review Interface

```
┌─────────────────────────────────────────────────────────────┐
│  CSF MAPPING REVIEW                                          │
├─────────────────────────────────────────────────────────────┤
│  Metric: Privileged Access Review Frequency                  │
│                                                              │
│  Suggested: PROTECT > PR.AA                      [92%]       │
│  ○ Accept                                                    │
│  ○ Change to: [Select Function ▼] [Select Category ▼]       │
│                                                              │
│  Reasoning: This metric relates to access control            │
│  reviews which fall under PR.AA identity management          │
│  and access control subcategory.                             │
│                                                              │
│  [← Previous] [Skip]                           [Next →]      │
└─────────────────────────────────────────────────────────────┘
```

## Enhancement Suggestions

### Catalog Enhancement

When importing custom catalogs, AI suggests improvements:

**Original Metric:**
```
Name: "patch compliance"
Description: "patches"
Target: 100
Priority: (not set)
```

**AI Enhancement:**
```
Name: "Patch Compliance Rate"
Description: "Percentage of systems with all critical
             and high severity patches applied within
             the defined SLA timeframe"
Target: 95 (adjusted for realistic achievement)
Priority: High
Direction: higher_is_better
Reasoning:
  - Capitalized and clarified name
  - Expanded description for clarity
  - Adjusted target from 100% to 95% (more realistic)
  - Set as High priority (security-critical)
```

### Enhancement Categories

| Category | Description |
|----------|-------------|
| **Clarity** | Improve names and descriptions |
| **Targets** | Suggest realistic target values |
| **Priority** | Recommend appropriate priority |
| **Direction** | Correct measurement direction |
| **Completeness** | Add missing fields |
| **Alignment** | Better CSF mapping |

### Bulk Enhancement

Process multiple metrics at once:

```
POST /api/v1/ai/enhance
{
  "catalog_items": [
    { "name": "patch compliance", ... },
    { "name": "vuln count", ... },
    { "name": "training", ... }
  ]
}
```

**Response:**
```json
{
  "enhancements": [
    {
      "original": { "name": "patch compliance" },
      "suggested": { "name": "Patch Compliance Rate", ... },
      "changes": ["name", "description", "priority"]
    },
    ...
  ],
  "summary": {
    "total_metrics": 3,
    "enhanced": 3,
    "changes_suggested": 8
  }
}
```

## Audit Trail

All AI-driven changes are logged:

### Change Log Entry

```json
{
  "id": "uuid",
  "timestamp": "2026-01-15T10:30:00Z",
  "action": "metric_created",
  "source": "ai_assistant",
  "mode": "metrics",
  "user_id": "user_123",
  "prompt": "Create a metric for EDR coverage",
  "result": {
    "metric_id": "metric_456",
    "metric_name": "EDR Agent Coverage Rate"
  },
  "ai_provider": "anthropic",
  "ai_model": "claude-sonnet-4-20250514"
}
```

### Audit Log Access

View AI change history:
1. Navigate to Settings > AI Audit Log
2. Filter by action type, date, user
3. Export for compliance reporting

### Logged Actions

| Action | Description |
|--------|-------------|
| `metric_created` | New metric from AI |
| `metric_enhanced` | AI improvement applied |
| `csf_mapping_suggested` | Framework mapping |
| `report_generated` | Executive report |
| `recommendation_made` | Improvement suggestion |

## API Reference

### Chat Endpoint

```bash
POST /api/v1/ai/chat
Content-Type: application/json

{
  "mode": "metrics",
  "prompt": "Create a metric for tracking backup success",
  "context": {
    "current_function": "RECOVER",
    "user_id": "user_123"
  }
}
```

**Response:**
```json
{
  "response_type": "metric_suggestion",
  "content": {
    "metric": {
      "name": "Backup Success Rate",
      "description": "...",
      "target_value": 99.9,
      ...
    },
    "explanation": "Based on your request...",
    "confidence": 0.95
  }
}
```

### Enhancement Endpoint

```bash
POST /api/v1/ai/enhance
Content-Type: application/json

{
  "catalog_items": [...],
  "enhancement_types": ["clarity", "targets", "priority"]
}
```

## Error Handling

### API Timeout

If AI requests timeout:
- Automatic retry (up to 3 attempts)
- Fallback to OpenAI if configured
- User notification with option to retry

### Rate Limiting

| Limit | Value |
|-------|-------|
| Requests per minute | 60 |
| Tokens per request | 4,000 |
| Concurrent requests | 5 |

### Error Messages

| Error | Cause | Resolution |
|-------|-------|------------|
| `AI_TIMEOUT` | Request took too long | Retry or simplify prompt |
| `AI_RATE_LIMIT` | Too many requests | Wait and retry |
| `AI_INVALID_KEY` | Bad API key | Check .env configuration |
| `AI_UNAVAILABLE` | Service down | Use fallback or wait |

---

**Next:** [Scoring Methodology](scoring-methodology.md) - Understand how risk scores are calculated
