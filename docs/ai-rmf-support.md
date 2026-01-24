# NIST AI RMF 1.0 Support

## Overview

The Cybersecurity Metrics Dashboard now supports the **NIST AI Risk Management Framework (AI RMF) 1.0** alongside NIST CSF 2.0. This enables organizations to track and manage AI-specific risks using the same powerful dashboard, scoring methodology, and AI-assisted features.

## Multi-Framework Architecture

The application provides a unified interface for managing metrics across multiple frameworks:

| Framework | Functions | Focus Area |
|-----------|-----------|------------|
| NIST CSF 2.0 | Govern, Identify, Protect, Detect, Respond, Recover | Cybersecurity Risk |
| NIST AI RMF 1.0 | Govern, Map, Measure, Manage | AI Trustworthiness |

### Framework Selector

A framework selector in the UI header allows seamless switching between frameworks. All views automatically adapt to show framework-specific data:
- Dashboard scores and function breakdowns
- Metrics catalog with appropriate columns
- Filtering and search options
- AI-generated metric suggestions

## AI RMF Functions

### Govern
Establishes and maintains policies, processes, and organizational structures for AI risk management.

**Sample Metrics:**
- AI Systems Inventory Completeness
- AI Policy Coverage
- AI Risk Management Training Completion
- AI Team Diversity Index

### Map
Identifies and documents AI system contexts, purposes, and potential impacts.

**Sample Metrics:**
- AI System Purpose Documentation
- AI Risk Assessment Completion
- AI Impact Assessment Coverage

### Measure
Evaluates and monitors AI system performance, bias, and trustworthiness.

**Sample Metrics:**
- AI Model Accuracy
- AI Bias Detection Rate
- AI Explainability Score
- AI Security Testing Coverage
- AI Model Drift Detection
- AI Privacy Compliance Rate

### Manage
Implements risk treatment strategies and continuous monitoring.

**Sample Metrics:**
- AI Incident Response Time
- AI Model Decommission Compliance
- Third-Party AI Risk Monitoring
- AI Stakeholder Feedback Integration

## AI RMF Trustworthiness Characteristics

AI RMF metrics are associated with **Trustworthiness Characteristics** that describe the desired properties of AI systems:

| Characteristic | Description | Example Metrics |
|----------------|-------------|-----------------|
| **Valid & Reliable** | AI outputs are accurate and consistent | Model Accuracy, Drift Detection |
| **Safe** | AI operates without causing harm | Impact Assessment, Decommission Compliance |
| **Secure & Resilient** | AI resists attacks and recovers from failures | Security Testing, Third-Party Monitoring |
| **Accountable & Transparent** | AI decisions can be traced and explained | Inventory, Policy Coverage, Incident Response |
| **Explainable & Interpretable** | AI reasoning can be understood | Explainability Score |
| **Privacy Enhanced** | AI protects personal information | Privacy Compliance Rate |
| **Fair** | AI treats all groups equitably | Bias Detection, Team Diversity |

### Trustworthiness in the UI

The Metrics Grid displays trustworthiness characteristics in a dedicated column with blue-colored chips for easy identification. Hover over any column header to see a tooltip explaining the field's purpose.

## AI RMF Metrics Catalog

The application includes 18 sample AI RMF metrics covering all functions and trustworthiness characteristics:

### By Function

| Function | Metric Count | Priority Distribution |
|----------|-------------|----------------------|
| Govern | 4 | 2 High, 2 Medium |
| Map | 3 | 3 High |
| Measure | 6 | 5 High, 1 Medium |
| Manage | 4 | 2 High, 2 Medium |

### Metric Numbering Convention

AI RMF metrics follow the pattern: `AI-{FUNCTION}-{NUMBER}`

Examples:
- `AI-GOV-001` - AI Systems Inventory Completeness
- `AI-MAP-001` - AI System Purpose Documentation
- `AI-MEA-001` - AI Model Accuracy
- `AI-MAN-001` - AI Incident Response Time

## Dashboard Features

### AI RMF Dashboard View

When the AI RMF framework is selected, the dashboard displays:

1. **Overall AI Risk Score** - Weighted aggregate across all AI RMF functions
2. **Function Score Cards** - Individual scores for Govern, Map, Measure, Manage
3. **Coverage View** - Visual breakdown by category and subcategory
4. **Metrics Needing Attention** - AI metrics with lowest performance scores

### Color Scheme

AI RMF elements use a **teal color theme** to distinguish from CSF 2.0:
- Function chips: Teal (`#00897b`)
- Category chips: Light teal (`#26a69a`)
- Subcategory codes: Teal background (`#e0f2f1`) with dark teal text (`#00695c`)
- Trustworthiness chips: Blue (`#e3f2fd` background, `#1565c0` text)

## Scoring Methodology

AI RMF metrics use the same gap-to-target scoring methodology as CSF 2.0:

### Direction Types

- **Higher is Better**: Coverage rates, compliance percentages
- **Lower is Better**: Response times, incident counts
- **Binary**: Pass/fail assessments

### Priority Weighting

| Priority | Weight |
|----------|--------|
| High (1) | 1.0 |
| Medium (2) | 0.6 |
| Low (3) | 0.3 |

### Risk Ratings

| Score Range | Rating | Color |
|-------------|--------|-------|
| ≥85% | Low Risk | Green |
| 65-84% | Moderate | Yellow |
| 40-64% | Elevated | Orange |
| <40% | High Risk | Red |

## Column Tooltips

All column headers in the Metrics Grid display helpful tooltips on hover, explaining:
- Field purpose and meaning
- Expected values or formats
- Relationship to framework structure

### AI RMF Column Tooltips

| Column | Tooltip |
|--------|---------|
| AI RMF Function | NIST AI RMF 1.0 Function: Govern, Map, Measure, or Manage |
| AI RMF Category | NIST AI RMF 1.0 Category within the function |
| Subcategory ID | NIST AI RMF 1.0 Subcategory identifier (e.g., GOVERN-1.1) |
| Trustworthiness | AI RMF Trustworthiness Characteristic (e.g., Valid & Reliable, Fair, Safe) |
| Metric Score | Gap-to-target performance score (0-100%). Higher is better. |

## AI-Powered Features

### Metric Generation

The AI assistant can generate AI RMF-aligned metrics from natural language:

```
"Add a metric for tracking AI model fairness testing"
```

The AI will automatically:
1. Generate appropriate metric name and description
2. Assign to the correct AI RMF function (Measure)
3. Map to relevant subcategory (MEASURE-2.11)
4. Suggest trustworthiness characteristic (Fair)
5. Recommend formula, target, and direction

### Formula Conventions

AI-generated formulas follow NIST CSF conventions:
- Use division for ratios (e.g., `Tested models / Total models`)
- No "× 100" - the system handles percentage display
- Clear numerator/denominator structure

## Data Model

### AI RMF Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `ai_rmf_function` | enum | Govern, Map, Measure, Manage |
| `ai_rmf_function_name` | string | Human-readable function name |
| `ai_rmf_category_code` | string | Category identifier (e.g., GOVERN-1) |
| `ai_rmf_category_name` | string | Category display name |
| `ai_rmf_subcategory_code` | string | Subcategory identifier (e.g., GOVERN-1.6) |
| `ai_rmf_subcategory_outcome` | string | Expected outcome text |
| `trustworthiness_characteristic` | string | Trustworthiness category |

### Sample Metric JSON

```json
{
  "metric_number": "AI-MEA-002",
  "name": "AI Bias Detection Rate",
  "description": "Percentage of AI models tested for bias",
  "formula": "AI models with bias testing / Total production AI models",
  "risk_definition": "Untested models may perpetuate societal biases and violate anti-discrimination regulations.",
  "ai_rmf_function": "measure",
  "ai_rmf_category_code": "MEASURE-2",
  "ai_rmf_subcategory_code": "MEASURE-2.11",
  "direction": "higher_is_better",
  "target_value": 100,
  "target_units": "percent",
  "current_value": 55,
  "priority_rank": 1,
  "trustworthiness_characteristic": "fair"
}
```

## Best Practices

### Implementing AI RMF Metrics

1. **Start with Inventory**: Know what AI systems you have before measuring them
2. **Map to Business Impact**: Connect metrics to organizational objectives
3. **Balance Characteristics**: Cover all trustworthiness areas, not just technical
4. **Regular Assessment**: AI risks evolve - update metrics as systems change

### Integrating with CSF 2.0

Many organizations use both frameworks together:
- CSF 2.0 for overall cybersecurity program
- AI RMF for AI-specific risk management
- Dashboard supports switching or parallel tracking

## References

- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [AI RMF Playbook](https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook)
- [AI RMF Crosswalk to CSF](https://www.nist.gov/document/crosswalk-ai-rmf-10-csf-20)
