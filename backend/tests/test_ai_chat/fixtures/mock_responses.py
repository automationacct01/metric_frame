"""Realistic mock AI response data for testing the AI chat router.

These responses simulate what different AI providers would return
for various modes and actions in the AI chat system.
"""

import json


# =============================================================================
# METRICS MODE RESPONSES
# =============================================================================

METRICS_MODE_CREATE_RESPONSE = json.dumps({
    "assistant_message": "I've created a metric to track MFA adoption rate across your organization. This metric measures the percentage of users enrolled in multi-factor authentication, which is critical for access control under the PROTECT function.",
    "actions": [
        {
            "action": "add_metric",
            "metric": {
                "name": "MFA Adoption Rate",
                "description": "Percentage of all user accounts enrolled in multi-factor authentication (MFA). Measures the organization's progress toward eliminating single-factor authentication vulnerabilities.",
                "formula": "Users with MFA Enabled / Total Active Users",
                "framework": "csf_2_0",
                "function_code": "pr",
                "category_code": "PR.AA",
                "priority_rank": 1,
                "direction": "higher_is_better",
                "target_value": 95.0,
                "target_units": "%",
                "owner_function": "IAM",
                "collection_frequency": "weekly",
                "data_source": "Identity Provider (Okta/Azure AD)"
            }
        }
    ],
    "needs_confirmation": True
})

METRICS_MODE_UPDATE_RESPONSE = json.dumps({
    "assistant_message": "I've updated the target value for the MFA Adoption Rate metric to reflect the new enterprise standard of 99%.",
    "actions": [
        {
            "action": "update_metric",
            "metric_id": "placeholder-uuid",
            "changes": {
                "target_value": 99.0,
                "description": "Updated target to reflect zero-trust architecture requirements."
            }
        }
    ],
    "needs_confirmation": True
})

METRICS_MODE_DELETE_RESPONSE = json.dumps({
    "assistant_message": "I've marked the deprecated metric for removal. It will be deactivated rather than permanently deleted.",
    "actions": [
        {
            "action": "delete_metric",
            "metric_id": "placeholder-uuid"
        }
    ],
    "needs_confirmation": True
})


# =============================================================================
# EXPLAIN MODE RESPONSES
# =============================================================================

EXPLAIN_MODE_RESPONSE = (
    "The MFA Adoption Rate metric measures the percentage of your organization's "
    "user accounts that have multi-factor authentication enabled. This is a critical "
    "security control because single-factor authentication (passwords alone) is one of "
    "the most common attack vectors for credential theft.\n\n"
    "A score of 85% means that 85 out of every 100 user accounts have MFA enabled. "
    "However, the remaining 15% represent a significant risk surface. Each unprotected "
    "account is a potential entry point for attackers using phishing, credential stuffing, "
    "or brute force attacks.\n\n"
    "The gap-to-target methodology scores this as: current_value / target_value = 85/95 = "
    "89.5%. Your target of 95% is an industry best practice, and you're 10 percentage "
    "points away from achieving it.\n\n"
    "Recommendation: Prioritize enabling MFA for privileged accounts (administrators, "
    "executives) first, then roll out to remaining standard users."
)


# =============================================================================
# REPORT MODE RESPONSES
# =============================================================================

REPORT_MODE_RESPONSE = (
    "## Executive Cybersecurity Risk Summary\n\n"
    "### Overall Assessment\n"
    "The organization's cybersecurity posture shows moderate risk across NIST CSF 2.0 "
    "functions. The overall weighted score is 72.3%, placing the organization in the "
    "Moderate risk category.\n\n"
    "### Key Findings\n\n"
    "**PROTECT (PR): 68.2% - Moderate Risk**\n"
    "Access control metrics show gaps in MFA adoption (85% vs 95% target) and privileged "
    "access management. Patching cadence has improved but remains below the 72-hour target "
    "for critical vulnerabilities.\n\n"
    "**DETECT (DE): 61.5% - Elevated Risk**\n"
    "Mean Time to Detect (MTTD) exceeds the 4-hour target by 2.3 hours. Monitoring coverage "
    "is at 78% of critical assets, leaving a significant blind spot.\n\n"
    "**GOVERN (GV): 82.1% - Low Risk**\n"
    "Governance metrics are strong with regular board briefings and updated policies. "
    "Budget allocation for cybersecurity is at target levels.\n\n"
    "### Priority Actions\n"
    "1. Accelerate MFA rollout to reach 95% target\n"
    "2. Reduce MTTD through enhanced SIEM tuning and alert prioritization\n"
    "3. Expand monitoring coverage to remaining 22% of critical assets"
)


# =============================================================================
# RECOMMENDATIONS MODE RESPONSES
# =============================================================================

RECOMMENDATIONS_RESPONSE = json.dumps({
    "recommendations": [
        {
            "metric_name": "Phishing Simulation Click Rate",
            "description": "Percentage of employees who click on simulated phishing emails during security awareness testing",
            "function_code": "pr",
            "category_code": "PR.AT",
            "priority": 1,
            "rationale": "No existing metrics track security awareness training effectiveness. Phishing remains the top initial attack vector.",
            "expected_impact": "Provides visibility into human risk factor and training program effectiveness"
        },
        {
            "metric_name": "Third-Party Risk Assessment Coverage",
            "description": "Percentage of critical vendors with completed security risk assessments within the past 12 months",
            "function_code": "gv",
            "category_code": "GV.SC",
            "priority": 2,
            "rationale": "Supply chain risk management is underrepresented in current metrics. Only 1 metric exists for the GV.SC category.",
            "expected_impact": "Improves supply chain risk visibility and supports regulatory compliance"
        }
    ],
    "gap_analysis": {
        "underrepresented_functions": ["de", "rc"],
        "coverage_percentage": 75.0,
        "overall_assessment": "Current metric coverage addresses 75% of NIST CSF 2.0 categories. DETECT and RECOVER functions have the fewest metrics relative to their importance."
    }
})


# =============================================================================
# ERROR / EDGE CASE RESPONSES
# =============================================================================

MALFORMED_JSON_RESPONSE = (
    "Sure, I can help with that metric. Here's what I recommend:\n"
    "{ invalid json content without proper structure }\n"
    "Let me know if you'd like me to adjust anything."
)

EMPTY_RESPONSE = ""


# =============================================================================
# GENERATE METRIC ENDPOINT RESPONSES
# =============================================================================

GENERATE_METRIC_RESPONSE = json.dumps({
    "name": "Vulnerability Remediation SLA Compliance",
    "description": "Percentage of identified vulnerabilities remediated within the defined SLA timeframe based on severity (critical: 72h, high: 7d, medium: 30d, low: 90d)",
    "csf_function": "pr",
    "csf_category_code": "PR.PS",
    "csf_subcategory_code": "PR.PS-02",
    "priority_rank": 1,
    "direction": "higher_is_better",
    "target_value": 95,
    "target_units": "percent",
    "current_value": None,
    "owner_function": "SecOps",
    "collection_frequency": "weekly",
    "formula": "Vulnerabilities Remediated Within SLA / Total Vulnerabilities Identified",
    "risk_definition": "Tracks the organization's ability to address known security weaknesses promptly. Poor remediation rates leave exploitable gaps that adversaries can leverage for unauthorized access or data breaches.",
    "notes": None
})
