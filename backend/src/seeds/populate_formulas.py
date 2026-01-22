"""Populate formula field for all metrics."""

from sqlalchemy.orm import Session
from ..db import SessionLocal
from ..models import Metric

# Mapping of metric names to their formulas
METRIC_FORMULAS = {
    # Detection metrics
    "Mean Time to Detect (MTTD)": "Σ(Detection Time - Incident Start Time) / Total Incidents",
    "Security Event Monitoring Coverage": "(Systems with Active Monitoring / Total Critical Systems) × 100",
    "Alert False Positive Rate": "(False Positive Alerts / Total Alerts) × 100",

    # Governance metrics
    "Board Cybersecurity Briefing Frequency": "Count of Board Briefings per Year",
    "Cybersecurity Policy Compliance Rate": "(Compliant Units / Total Organizational Units) × 100",
    "Third-Party Risk Assessments Completed": "(Assessed Critical Vendors / Total Critical Vendors) × 100",
    "Cybersecurity Budget as % of IT Budget": "(Cybersecurity Budget / Total IT Budget) × 100",

    # Identity metrics
    "Asset Inventory Completeness": "(Tracked Assets / Total Known Assets) × 100",
    "Vulnerability Scanning Coverage": "(Assets with Active Scanning / Total Network Assets) × 100",
    "Critical Vulnerabilities Age": "Σ(Current Date - Vulnerability Discovery Date) / Total Critical Vulns",

    # Protection metrics
    "Multi-Factor Authentication Coverage": "(Accounts with MFA / Total User Accounts) × 100",
    "Data Encryption at Rest": "(Encrypted Sensitive Data Volume / Total Sensitive Data Volume) × 100",
    "Patch Compliance Rate": "(Patched Systems / Total Systems) × 100",
    "Security Awareness Training Completion": "(Employees Completed Training / Total Employees) × 100",

    # Recovery metrics
    "Backup Success Rate": "(Successful Backups / Total Backup Attempts) × 100",
    "Recovery Time Objective (RTO) Achievement": "(Recoveries within RTO / Total Recoveries) × 100",
    "Backup Restore Success Rate": "(Successful Restores / Total Restore Tests) × 100",

    # Response metrics
    "Mean Time to Respond (MTTR)": "Σ(Response Time - Detection Time) / Total Incidents",
    "Incident Containment Rate": "(Contained Incidents / Total Incidents) × 100",
    "Incident Response Plan Test Frequency": "Count of IR Plan Tests per Year",

    # AI RMF metrics
    "AI Systems Inventory Completeness": "(Documented AI Systems / Total AI Systems) × 100",
    "AI Policy Coverage": "(AI Systems with Policies / Total AI Systems) × 100",
    "AI Incident Response Time": "Σ(Resolution Time - Report Time) / Total AI Incidents",
    "Third-Party AI Risk Monitoring": "(Monitored Third-Party AI / Total Third-Party AI) × 100",
    "AI System Purpose Documentation": "(AI Systems with Documentation / Total AI Systems) × 100",
    "AI Context Documentation Rate": "(AI Systems with Context Docs / Total AI Systems) × 100",
    "AI Stakeholder Impact Assessment Coverage": "(Assessed AI Systems / Total AI Systems) × 100",
    "AI Performance Baseline Coverage": "(AI Systems with Baselines / Total AI Systems) × 100",
    "AI Accuracy Monitoring Rate": "(AI Systems with Accuracy Monitoring / Total AI Systems) × 100",
    "AI Bias Testing Coverage": "(AI Systems Tested for Bias / Total AI Systems) × 100",
    "AI Explainability Score": "Average Explainability Rating across AI Systems (1-100)",
    "AI Drift Detection Coverage": "(AI Systems with Drift Detection / Total AI Systems) × 100",
    "AI Risk Treatment Plan Coverage": "(AI Systems with Risk Plans / Total AI Systems) × 100",
    "AI Incident Resolution Rate": "(Resolved AI Incidents / Total AI Incidents) × 100",
    "AI Model Update Frequency": "Average Model Updates per Year across AI Systems",
    "AI Feedback Integration Rate": "(AI Systems with Feedback Loops / Total AI Systems) × 100",
    "AI Continuous Improvement Score": "Average Improvement Implementation Rate across AI Systems",
    "AI Documentation Update Frequency": "Average Documentation Updates per Year",
}


def populate_formulas():
    """Update all metrics with their formulas."""
    db: Session = SessionLocal()

    try:
        metrics = db.query(Metric).all()
        updated_count = 0

        for metric in metrics:
            if metric.name in METRIC_FORMULAS:
                metric.formula = METRIC_FORMULAS[metric.name]
                updated_count += 1
                print(f"Updated: {metric.name}")
            elif not metric.formula:
                # Generate a generic formula based on units
                if metric.target_units == "percent":
                    metric.formula = f"(Measured Value / Target Value) × 100"
                elif metric.target_units == "hours":
                    metric.formula = f"Σ(Time Measurements) / Count"
                elif metric.target_units == "days":
                    metric.formula = f"Σ(Day Measurements) / Count"
                elif metric.target_units == "count":
                    metric.formula = f"Count of Occurrences"
                else:
                    metric.formula = f"Direct Measurement"
                updated_count += 1
                print(f"Generated generic formula for: {metric.name}")

        db.commit()
        print(f"\nUpdated {updated_count} metrics with formulas")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    populate_formulas()
