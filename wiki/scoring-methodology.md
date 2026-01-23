# Scoring Methodology

> **Last Updated:** January 2026
> **Status:** Active Development

---

A detailed explanation of how Cyber Metrics Flow calculates risk scores, from individual metrics through organizational rollups.

## Gap-to-Target Philosophy

The scoring system measures how close current values are to target values:

```
Score = How well are we meeting our security targets?

100% = At or exceeding target
 0%  = No progress toward target
```

This approach:
- Focuses on goal achievement rather than arbitrary scales
- Enables comparison across different metric types
- Supports both "higher is better" and "lower is better" metrics
- Provides actionable insight into improvement needed

## Direction Types

Metrics measure different aspects of security, requiring different scoring approaches:

### Higher is Better

**Definition:** Higher values indicate better performance

**Examples:**
- MFA adoption rate (target: 95%)
- Patch compliance (target: 100%)
- Training completion (target: 90%)

**Scoring Formula:**
```
score = min(100, (current_value / target_value) * 100)
```

**Example:**
```
Metric: MFA Adoption Rate
Current: 85%
Target: 95%
Score: (85 / 95) * 100 = 89.5%
```

### Lower is Better

**Definition:** Lower values indicate better performance

**Examples:**
- Mean Time to Detect (target: 1 hour)
- Vulnerability count (target: 0)
- False positive rate (target: 5%)

**Scoring Formula:**
```
if current_value <= target_value:
    score = 100
else:
    score = max(0, (target_value / current_value) * 100)
```

**Example:**
```
Metric: Mean Time to Detect (MTTD)
Current: 4 hours
Target: 1 hour
Score: (1 / 4) * 100 = 25%
```

### Target Range

**Definition:** Value should fall within a specified range

**Examples:**
- Budget variance (target: -5% to +5%)
- Staffing ratio (target: 1:100 to 1:150)
- Alert volume (target: 50-200 per day)

**Scoring Formula:**
```
if lower_bound <= current_value <= upper_bound:
    score = 100
else:
    distance = min(|current - lower_bound|, |current - upper_bound|)
    range_size = upper_bound - lower_bound
    score = max(0, 100 - (distance / range_size) * 100)
```

**Example:**
```
Metric: Security Budget Variance
Current: +8%
Target Range: -5% to +5%
Distance from range: 3%
Score: 100 - (3 / 10) * 100 = 70%
```

### Binary

**Definition:** Pass/fail metrics with only two states

**Examples:**
- Annual penetration test completed (yes/no)
- DR plan documented (yes/no)
- CISO reports to board (yes/no)

**Scoring Formula:**
```
if current_value == target_value:
    score = 100
else:
    score = 0
```

**Example:**
```
Metric: Annual Penetration Test
Current: "Completed"
Target: "Completed"
Score: 100%
```

## Individual Metric Scoring

### Complete Scoring Algorithm

```python
def compute_metric_score(metric):
    current = metric.current_value
    target = metric.target_value
    direction = metric.direction

    if current is None or target is None:
        return None  # Cannot score without values

    if direction == "higher_is_better":
        if target == 0:
            return 100 if current >= 0 else 0
        score = (current / target) * 100
        return min(100, max(0, score))

    elif direction == "lower_is_better":
        if current <= target:
            return 100
        if current == 0:
            return 100
        score = (target / current) * 100
        return min(100, max(0, score))

    elif direction == "target_range":
        lower = metric.target_lower
        upper = metric.target_upper
        if lower <= current <= upper:
            return 100
        if current < lower:
            distance = lower - current
        else:
            distance = current - upper
        range_size = upper - lower
        if range_size == 0:
            return 0 if distance > 0 else 100
        score = 100 - (distance / range_size) * 100
        return max(0, score)

    elif direction == "binary":
        return 100 if current == target else 0

    return None
```

### Score Validation

All scores are bounded:
- Minimum: 0%
- Maximum: 100%
- Invalid data: `null` (excluded from aggregations)

## Weighted Aggregation

### Priority Weights

Metrics are weighted by priority:

| Priority | Weight | Rationale |
|----------|--------|-----------|
| **High** | 1.0 | Critical security controls |
| **Medium** | 0.6 | Important but not critical |
| **Low** | 0.3 | Nice-to-have or supporting |

### Weighted Average Formula

```
weighted_score = Σ(score_i × weight_i) / Σ(weight_i)

Where:
  score_i = individual metric score
  weight_i = priority weight for metric i
```

### Example Calculation

```
Category: PR.AA (Access Control)
Metrics:
  - MFA Adoption:     Score 89%, Priority High (1.0)
  - SSO Coverage:     Score 75%, Priority Medium (0.6)
  - Password Policy:  Score 95%, Priority Low (0.3)

Weighted Sum = (89 × 1.0) + (75 × 0.6) + (95 × 0.3)
             = 89 + 45 + 28.5
             = 162.5

Weight Sum = 1.0 + 0.6 + 0.3 = 1.9

Category Score = 162.5 / 1.9 = 85.5%
```

## Category-Level Scoring

### Aggregation Process

```
CSF Category Score = weighted_average(all metrics in category)
```

### Category Score Display

```
Function: PROTECT (PR)
├── PR.AA - Access Control           85.5%  ████████░░
├── PR.AT - Awareness & Training     72.0%  ███████░░░
├── PR.DS - Data Security            91.2%  █████████░
├── PR.IP - Information Protection   68.4%  ██████░░░░
├── PR.MA - Maintenance              78.9%  ███████░░░
├── PR.PS - Protective Technology    82.1%  ████████░░
└── PR.PT - Platform Security        76.5%  ███████░░░
```

### Handling Missing Data

| Scenario | Handling |
|----------|----------|
| No metrics in category | Category excluded from aggregation |
| Metric without current value | Metric excluded from aggregation |
| All metrics null | Category score = null |

## Function-Level Scoring

### Aggregation Process

```
CSF Function Score = weighted_average(all categories in function)
```

Categories can optionally be weighted (default: equal weight).

### Function Score Example

```
Function: PROTECT (PR)

Categories:
  PR.AA: 85.5% (weight 1.0)
  PR.AT: 72.0% (weight 1.0)
  PR.DS: 91.2% (weight 1.0)
  PR.IP: 68.4% (weight 1.0)
  PR.MA: 78.9% (weight 1.0)
  PR.PS: 82.1% (weight 1.0)
  PR.PT: 76.5% (weight 1.0)

Function Score = (85.5 + 72.0 + 91.2 + 68.4 + 78.9 + 82.1 + 76.5) / 7
               = 554.6 / 7
               = 79.2%
```

## Overall Organizational Score

### Calculation

```
Overall Score = weighted_average(all function scores)
```

### Example

```
Function Scores:
  GOVERN:   78%
  IDENTIFY: 65%
  PROTECT:  79%
  DETECT:   71%
  RESPOND:  68%
  RECOVER:  74%

Overall = (78 + 65 + 79 + 71 + 68 + 74) / 6
        = 435 / 6
        = 72.5%
```

## Risk Rating System

### 5-Tier Rating Scale

| Score Range | Rating | Color | Interpretation |
|-------------|--------|-------|----------------|
| 90-100% | Very Low | Dark Green | Exceeding security targets |
| 75-89% | Low | Green | Meeting most targets |
| 60-74% | Moderate | Yellow | Approaching targets |
| 40-59% | Elevated | Orange | Below targets |
| 0-39% | High | Red | Significantly below targets |

### Rating Assignment

```python
def get_risk_rating(score):
    if score >= 90:
        return "Very Low"
    elif score >= 75:
        return "Low"
    elif score >= 60:
        return "Moderate"
    elif score >= 40:
        return "Elevated"
    else:
        return "High"
```

### Visual Representation

```
Score Card Display:

┌─────────────────┐
│    PROTECT      │
│      79%        │
│ ████████░░░░░░░ │
│      LOW        │
└─────────────────┘

Progress Bar:
  - Filled portion = score percentage
  - Color = risk rating color
```

## Configurable Thresholds

### Environment Variables

Customize rating thresholds in `backend/.env`:

```env
# Score thresholds (percentages)
SCORE_VERY_LOW_THRESHOLD=90
SCORE_LOW_THRESHOLD=75
SCORE_MODERATE_THRESHOLD=60
SCORE_ELEVATED_THRESHOLD=40
# Below ELEVATED is "High Risk"
```

### Custom Threshold Example

For a more conservative organization:

```env
SCORE_VERY_LOW_THRESHOLD=95
SCORE_LOW_THRESHOLD=85
SCORE_MODERATE_THRESHOLD=70
SCORE_ELEVATED_THRESHOLD=50
```

### Threshold Precedence

1. Environment variables (highest)
2. Database configuration
3. Default values (lowest)

## Catalog-Aware Scoring

### Active Catalog Integration

When a custom catalog is active:
1. Scoring uses catalog metrics instead of defaults
2. CSF mappings from catalog determine aggregation
3. Custom priorities are respected

### Scoring Source Selection

```python
def get_metrics_for_scoring(user):
    if user.active_catalog:
        return get_catalog_metrics(user.active_catalog.id)
    else:
        return get_default_metrics()
```

### Cross-Catalog Comparison

Compare scores across catalogs:

```
┌─────────────────────────────────────────────────────────┐
│  CATALOG COMPARISON: PROTECT Function                    │
├─────────────────────────────────────────────────────────┤
│  Default Catalog (208 metrics)           79.2%          │
│  ████████████████░░░░                    LOW            │
│                                                          │
│  Q4 Security Catalog (45 metrics)        72.8%          │
│  ██████████████░░░░░░                    MODERATE       │
│                                                          │
│  Compliance Catalog (128 metrics)        81.5%          │
│  █████████████████░░░                    LOW            │
└─────────────────────────────────────────────────────────┘
```

## Score History and Trends

### Historical Tracking

Scores are recorded over time:

```
┌────────────────────────────────────────────────────────────┐
│  PROTECT Function Score - 12 Month Trend                    │
│                                                              │
│  85% ┤                                    ●                 │
│  80% ┤                          ●────●───●                  │
│  75% ┤               ●────●────●                            │
│  70% ┤    ●────●────●                                       │
│  65% ┤───●                                                  │
│      └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴── │
│       Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov │
└────────────────────────────────────────────────────────────┘
```

### Trend Indicators

| Indicator | Meaning |
|-----------|---------|
| ↑ | Score increased from previous period |
| ↓ | Score decreased from previous period |
| → | Score unchanged |
| ⚠ | Significant change (>5 points) |

## Scoring API

### Get Function Scores

```bash
GET /api/v1/scores/functions

Response:
{
  "scores": [
    {
      "function_code": "PR",
      "function_name": "PROTECT",
      "score": 79.2,
      "rating": "Low",
      "metric_count": 44,
      "trend": "up"
    },
    ...
  ],
  "overall_score": 72.5,
  "overall_rating": "Moderate"
}
```

### Get Category Breakdown

```bash
GET /api/v1/scores/functions/PR/categories

Response:
{
  "function_code": "PR",
  "categories": [
    {
      "category_code": "PR.AA",
      "category_name": "Identity Management...",
      "score": 85.5,
      "rating": "Low",
      "metric_count": 8
    },
    ...
  ]
}
```

---

**Next:** [Frameworks Reference](frameworks-reference.md) - Learn about NIST CSF 2.0, AI RMF, and Cyber AI Profile
