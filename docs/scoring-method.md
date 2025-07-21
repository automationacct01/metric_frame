# Scoring Methodology

## Overview

The NIST CSF 2.0 Metrics Dashboard uses a **gap-to-target** scoring methodology that provides transparent, outcomes-focused risk assessment aligned with cybersecurity governance best practices.

## Core Principles

1. **Outcome-Based**: Metrics measure actual business outcomes, not just technical activities
2. **Gap-to-Target**: Scoring reflects how far current performance is from established targets
3. **Weighted Aggregation**: Higher priority metrics have greater influence on overall scores
4. **Transparent Calculation**: All scoring logic is documented and auditable

## Metric-Level Scoring

### Step 1: Individual Metric Score Calculation

Each metric is scored on a scale of 0.0 to 1.0 based on its direction type:

#### Higher-is-Better Metrics
For metrics where higher values indicate better performance (e.g., compliance rates):
```
score = min(1.0, max(0.0, current_value / target_value))
```

**Example**: Policy Compliance Rate
- Current: 87.3%, Target: 95%
- Score = min(1.0, max(0.0, 87.3/95)) = 0.919

#### Lower-is-Better Metrics  
For metrics where lower values indicate better performance (e.g., incident response times):
```
score = max(0.0, min(1.0, 1.0 - (current_value / target_value)))
```

**Example**: Mean Time to Detect
- Current: 18.7 hours, Target: 24 hours
- Score = max(0.0, min(1.0, 1.0 - (18.7/24))) = 0.221

#### Target Range Metrics
For metrics that should fall within a specific range:
```
if low_tolerance <= current <= high_tolerance:
    score = 1.0
else:
    distance = min(abs(current - low), abs(current - high))
    range_span = high_tolerance - low_tolerance
    penalty_factor = min(2.0, distance / range_span)
    score = max(0.0, 1.0 - penalty_factor)
```

#### Binary Metrics
For yes/no or pass/fail metrics:
```
score = 1.0 if condition_met else 0.0
```

### Step 2: Gap-to-Target Percentage

For reporting purposes, we also calculate gap-to-target:
```
gap_pct = ((current - target) / target) * 100

# Adjust sign for lower-is-better metrics
if direction == "lower_is_better":
    gap_pct = -gap_pct
```

**Interpretation**:
- Positive gap = Above target (good)
- Negative gap = Below target (needs attention)

## Function-Level Scoring

### Step 3: Weighted Aggregation by CSF Function

Metrics are grouped by NIST CSF 2.0 Function and aggregated using weighted averages:

```
function_score = sum(metric_score_i * weight_i) / sum(weight_i)
```

**Default Weights by Priority**:
- High Priority (rank 1): 1.0
- Medium Priority (rank 2): 0.6  
- Low Priority (rank 3): 0.3

### Step 4: Risk Rating Assignment

Function scores are converted to risk ratings using configurable thresholds:

| Score Range | Risk Rating | Color | Description |
|-------------|-------------|-------|-------------|
| ≥85% | Low | Green | Good performance, minimal gaps |
| 65-84% | Moderate | Yellow | Some gaps, manageable risk |
| 40-64% | Elevated | Orange | Significant gaps, attention needed |
| <40% | High | Red | Major gaps, immediate action required |

## Overall Organizational Score

### Step 5: Cross-Function Aggregation

The overall organizational score is calculated as a simple average across all functions with active metrics:

```
overall_score = sum(function_score_i) / count(functions_with_metrics)
```

**Note**: Functions with no active metrics are excluded from the calculation.

## Scoring Examples

### Example 1: Govern Function

| Metric | Current | Target | Direction | Priority | Weight | Score | Contribution |
|--------|---------|--------|-----------|----------|--------|-------|--------------|
| Board Briefings | 4.0/year | 4.0/year | Higher | High | 1.0 | 1.000 | 1.000 |
| Policy Compliance | 87.3% | 95% | Higher | High | 1.0 | 0.919 | 0.919 |
| Budget Allocation | 6.2% | 8% | Higher | High | 1.0 | 0.775 | 0.775 |
| Training Completion | 92.1% | 95% | Higher | Medium | 0.6 | 0.969 | 0.581 |

**Function Score Calculation**:
```
weighted_sum = 1.000 + 0.919 + 0.775 + 0.581 = 3.275
total_weight = 1.0 + 1.0 + 1.0 + 0.6 = 3.6
function_score = 3.275 / 3.6 = 0.910 = 91.0%
risk_rating = "Low" (≥85%)
```

### Example 2: Detect Function

| Metric | Current | Target | Direction | Priority | Weight | Score | Contribution |
|--------|---------|--------|-----------|----------|--------|-------|--------------|
| MTTD | 18.7 hrs | 24 hrs | Lower | High | 1.0 | 0.221 | 0.221 |
| Monitoring Coverage | 97.5% | 100% | Higher | High | 1.0 | 0.975 | 0.975 |
| False Positive Rate | 28.3% | 20% | Lower | Medium | 0.6 | 0.000 | 0.000 |

**Function Score Calculation**:
```
weighted_sum = 0.221 + 0.975 + 0.000 = 1.196
total_weight = 1.0 + 1.0 + 0.6 = 2.6
function_score = 1.196 / 2.6 = 0.460 = 46.0%
risk_rating = "Elevated" (40-64%)
```

## Customization Options

### Adjustable Thresholds
Risk rating thresholds can be customized via environment variables:
```env
RISK_THRESHOLD_LOW=85.0      # Low risk threshold
RISK_THRESHOLD_MODERATE=65.0 # Moderate risk threshold  
RISK_THRESHOLD_ELEVATED=40.0 # Elevated risk threshold
```

### Custom Weights
Metric weights can be adjusted individually to reflect organizational priorities:
- Governance metrics might receive higher weights due to regulatory importance
- Technical metrics might be weighted based on business criticality
- Emerging risk areas might receive temporary weight boosts

### Target Adjustments
Targets should be:
- **Realistic**: Achievable with reasonable effort
- **Risk-Based**: Aligned with organizational risk tolerance
- **Industry-Aligned**: Benchmarked against peer organizations
- **Regularly Reviewed**: Updated as capabilities mature

## Best Practices

1. **Set Realistic Targets**: Overly aggressive targets result in consistently low scores that don't reflect actual risk
2. **Weight Strategically**: Use weights to emphasize metrics that most impact business risk
3. **Review Regularly**: Quarterly target and weight reviews ensure continued relevance
4. **Document Changes**: Maintain audit trail of scoring methodology updates
5. **Communicate Clearly**: Ensure stakeholders understand how scores are calculated

## Alignment with NIST Guidance

This scoring approach aligns with NIST Cybersecurity Framework principles:

- **Outcomes-Focused**: Measures business impact, not just technical compliance
- **Risk-Based**: Scores reflect actual risk to organizational objectives
- **Flexible**: Adaptable to different organizational contexts and maturity levels
- **Transparent**: Clear methodology enables informed decision-making
- **Continuous**: Supports ongoing improvement and risk management

## References

- NIST Cybersecurity Framework 2.0
- NIST SP 800-55: Performance Measurement Guide for Information Security
- ISO/IEC 27004: Information Security Management — Monitoring, measurement, analysis and evaluation