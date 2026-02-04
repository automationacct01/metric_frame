"""
Populate business_impact field for all metrics based on their category codes.

This module is called automatically during the seed process to ensure
all metrics have appropriate business impact descriptions.
"""

from sqlalchemy.orm import Session
from ..models import Metric, FrameworkCategory


# Category code to business impact mapping
CATEGORY_BUSINESS_IMPACT = {
    # GOVERN categories
    'GV.OC': 'Misaligned security spending, potential regulatory non-compliance, inability to demonstrate due diligence to stakeholders.',
    'GV.RM': 'Inconsistent risk acceptance, potential for unmitigated high-impact risks, audit findings, and board-level accountability gaps.',
    'GV.RR': 'Unclear ownership during incidents, delayed response, finger-pointing, and potential negligence claims.',
    'GV.PO': 'Outdated policies, non-compliance with regulations, inconsistent security practices across the organization.',
    'GV.OV': 'Insufficient security investment, missed strategic risks, board and executive blind spots.',
    'GV.SC': 'Vendor breaches impacting your data, regulatory fines for third-party failures, reputational damage from supplier incidents.',
    # IDENTIFY categories
    'ID.AM': 'Unpatched systems, data breaches through unknown assets, compliance failures, wasted security spending on wrong areas.',
    'ID.RA': 'Reactive rather than proactive security, missed vulnerabilities, inefficient resource allocation, audit findings.',
    'ID.IM': 'Security program stagnation, repeated incidents, inability to demonstrate progress to leadership, talent retention issues.',
    # PROTECT categories
    'PR.AA': 'Account takeover, privilege escalation, insider threats, regulatory fines for access control failures.',
    'PR.AT': 'Successful phishing attacks, data loss through human error, compliance violations, increased incident frequency.',
    'PR.DS': 'Data breaches, regulatory fines (GDPR, CCPA), intellectual property theft, customer trust erosion.',
    'PR.PS': 'System compromises, lateral movement by attackers, failed compliance audits, extended breach dwell time.',
    'PR.IR': 'Extended downtime, data loss, recovery costs, SLA violations, customer churn.',
    'PR.MA': 'Unpatched vulnerabilities exploited, system compromises, compliance failures, extended exposure windows.',
    'PR.PT': 'Misconfigured systems, security control gaps, unauthorized access, compliance audit failures.',
    # DETECT categories
    'DE.CM': 'Extended breach dwell time, larger data exfiltration, higher remediation costs, regulatory reporting failures.',
    'DE.AE': 'Missed attack patterns, alert fatigue, false negatives, inability to learn from security events.',
    # RESPOND categories
    'RS.MA': 'Extended incident duration, increased damage, regulatory notification failures, reputational harm.',
    'RS.AN': 'Recurring incidents, unknown attack scope, incomplete remediation, continued vulnerability.',
    'RS.CO': 'Regulatory notification failures, stakeholder trust erosion, legal liability, brand damage.',
    'RS.MI': 'Incomplete containment, attacker persistence, reinfection, extended business disruption.',
    # RECOVER categories
    'RC.RP': 'Extended outages, data loss, business interruption costs, potential business failure.',
    'RC.CO': 'Customer churn during outages, partner relationship damage, stock price impact, regulatory scrutiny.',
    'RC.IM': 'Recurring recovery failures, increasing recovery times, inability to meet resilience commitments.',
    # CSF 2.0 AI Profile categories (PROTECT)
    'PR.AI-AA': 'Unauthorized AI access, model theft, data poisoning through compromised credentials, compliance violations.',
    'PR.AI-DS': 'Training data breaches, model weight theft, AI intellectual property loss, competitive disadvantage.',
    'PR.AI-ML': 'Model extraction attacks, integrity compromises, unreliable AI outputs, safety incidents.',
    # CSF 2.0 AI Profile categories (DETECT)
    'DE.AI-CM': 'Undetected model drift, performance degradation, silent AI failures affecting business decisions.',
    'DE.AI-AE': 'Missed anomalous AI behavior, undetected adversarial attacks, delayed incident response.',
    'DE.AI-AD': 'Successful adversarial attacks, data poisoning going unnoticed, compromised AI integrity.',
    # CSF 2.0 AI Profile categories (RESPOND)
    'RS.AI-MA': 'Delayed AI incident response, extended impact duration, regulatory reporting failures.',
    'RS.AI-AN': 'Incomplete root cause analysis, recurring AI failures, inability to prevent future incidents.',
    'RS.AI-MT': 'Failed containment of compromised models, continued malicious AI behavior, extended damage.',
    # CSF 2.0 AI Profile categories (RECOVER)
    'RC.AI-RP': 'Extended AI system downtime, business process disruption, inability to restore AI services.',
    'RC.AI-RL': 'Corrupted model retraining, persistent data quality issues, degraded AI performance post-recovery.',
    # AI-specific categories (legacy/alternate codes)
    'GV.AI-OC': 'AI decisions conflicting with business ethics, regulatory violations, reputational harm from AI failures.',
    'GV.AI-RM': 'Biased AI decisions, adversarial attacks on models, regulatory fines, discrimination lawsuits.',
    'GV.AI-PO': 'Non-compliance with AI Act and similar regulations, inconsistent AI practices, liability exposure.',
    'ID.AI-AM': 'Shadow AI, uncontrolled model deployments, inability to respond to AI-specific incidents.',
    'ID.AI-RA': 'Exploited AI models, incorrect AI outputs affecting business decisions, compliance failures.',
    'ID.AI-VL': 'Adversarial attacks succeeding, model drift going undetected, AI system failures.',
    # AI RMF categories (GOVERN)
    'GOVERN-1': 'Lack of AI accountability, unclear decision authority, compliance failures, reputational damage from AI incidents.',
    'GOVERN-2': 'AI initiatives misaligned with organizational values, ethical violations, stakeholder trust erosion.',
    'GOVERN-3': 'Inadequate AI workforce capabilities, implementation failures, competitive disadvantage.',
    'GOVERN-4': 'Unmanaged AI risks, unexpected AI failures, financial losses from AI incidents.',
    'GOVERN-5': 'Non-compliance with AI regulations, legal penalties, market access restrictions.',
    'GOVERN-6': 'Uncoordinated AI governance, duplicated efforts, inconsistent AI practices across organization.',
    # AI RMF categories (MAP)
    'MAP-1': 'AI deployed without clear purpose, wasted resources, misaligned AI capabilities.',
    'MAP-2': 'Incomplete understanding of AI context, inappropriate AI applications, stakeholder harm.',
    'MAP-3': 'AI benefits not realized, negative impacts overlooked, poor AI investment decisions.',
    'MAP-4': 'Unknown AI risks, unaddressed vulnerabilities, unexpected AI failures.',
    'MAP-5': 'Unidentified AI impacts, harm to individuals or groups, legal liability.',
    # AI RMF categories (MEASURE)
    'MEASURE-1': 'Unmeasured AI risks, unknown risk levels, inability to prioritize AI risk mitigation.',
    'MEASURE-2': 'Biased or unreliable AI outputs, unfair decisions, trust erosion, legal exposure.',
    'MEASURE-3': 'Untracked AI performance, degraded model accuracy, business impact from AI drift.',
    'MEASURE-4': 'Undocumented AI feedback, missed improvement opportunities, repeated AI failures.',
    # AI RMF categories (MANAGE)
    'MANAGE-1': 'Unmitigated AI risks, AI incidents causing harm, financial and reputational losses.',
    'MANAGE-2': 'Unmanaged AI risks, accumulating risk exposure, catastrophic AI failures.',
    'MANAGE-3': 'Ineffective AI risk response, prolonged AI incidents, increased damage.',
    'MANAGE-4': 'Uncontrolled AI risk communication, stakeholder confusion, trust damage.',
}


def get_category_code_from_metric(db: Session, metric: Metric) -> str | None:
    """Get the category code for a metric."""
    if metric.category_id:
        category = db.query(FrameworkCategory).filter(FrameworkCategory.id == metric.category_id).first()
        if category:
            return category.code
    return None


def populate_business_impact(db: Session) -> int:
    """Populate business_impact for all metrics based on their category.

    Args:
        db: Database session

    Returns:
        Number of metrics updated
    """
    metrics = db.query(Metric).all()
    updated_count = 0

    for metric in metrics:
        # Skip if already has business_impact
        if metric.business_impact:
            continue

        # Get category code
        category_code = get_category_code_from_metric(db, metric)

        if category_code and category_code in CATEGORY_BUSINESS_IMPACT:
            metric.business_impact = CATEGORY_BUSINESS_IMPACT[category_code]
            updated_count += 1
        else:
            # Try to find a matching category code pattern (base code)
            if category_code:
                base_code = category_code.rsplit('-', 1)[0] if '-' in category_code else category_code
                if base_code in CATEGORY_BUSINESS_IMPACT:
                    metric.business_impact = CATEGORY_BUSINESS_IMPACT[base_code]
                    updated_count += 1

    return updated_count


def clear_business_impact(db: Session) -> int:
    """Clear business_impact for all metrics.

    Args:
        db: Database session

    Returns:
        Number of metrics cleared
    """
    result = db.query(Metric).filter(Metric.business_impact.isnot(None)).update(
        {Metric.business_impact: None},
        synchronize_session=False
    )
    return result
