"""Test data factories for AI chat tests.

Provides factory functions that create realistic test data objects
for frameworks, functions, categories, subcategories, and metrics
used in AI chat router testing.
"""

import uuid
from datetime import datetime
from unittest.mock import MagicMock

from src.models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    FrameworkSubcategory,
    Metric,
    MetricDirection,
    CollectionFrequency,
)
from src.schemas import FunctionScore, CSFFunction, RiskRating


def _make_uuid():
    """Generate a deterministic-looking UUID for tests."""
    return uuid.uuid4()


def create_sample_framework():
    """Create a sample NIST CSF 2.0 Framework object.

    Returns:
        Framework: A CSF 2.0 framework with realistic fields populated.
    """
    fw = MagicMock(spec=Framework)
    fw.id = _make_uuid()
    fw.code = "csf_2_0"
    fw.name = "NIST Cybersecurity Framework 2.0"
    fw.version = "2.0"
    fw.description = "Comprehensive cybersecurity framework"
    fw.active = True
    fw.is_extension = False
    fw.parent_framework_id = None
    fw.created_at = datetime.utcnow()
    fw.updated_at = datetime.utcnow()
    return fw


def create_sample_ai_rmf_framework():
    """Create a sample NIST AI RMF 1.0 Framework object.

    Returns:
        Framework: An AI RMF framework with realistic fields populated.
    """
    fw = MagicMock(spec=Framework)
    fw.id = _make_uuid()
    fw.code = "ai_rmf"
    fw.name = "NIST AI Risk Management Framework 1.0"
    fw.version = "1.0"
    fw.description = "AI risk management framework"
    fw.active = True
    fw.is_extension = False
    fw.parent_framework_id = None
    fw.created_at = datetime.utcnow()
    fw.updated_at = datetime.utcnow()
    return fw


def create_sample_functions(framework_id=None):
    """Create a list of NIST CSF 2.0 FrameworkFunction objects.

    Args:
        framework_id: Optional UUID for the parent framework.

    Returns:
        list[FrameworkFunction]: Six CSF 2.0 functions (GV, ID, PR, DE, RS, RC).
    """
    if framework_id is None:
        framework_id = _make_uuid()

    function_data = [
        ("gv", "Govern", "Cybersecurity governance and oversight", 0, "#4A90D9"),
        ("id", "Identify", "Asset and risk identification", 1, "#50C878"),
        ("pr", "Protect", "Protective safeguards", 2, "#FFB347"),
        ("de", "Detect", "Threat detection capabilities", 3, "#FF6B6B"),
        ("rs", "Respond", "Incident response", 4, "#DDA0DD"),
        ("rc", "Recover", "Recovery capabilities", 5, "#87CEEB"),
    ]

    functions = []
    for code, name, description, order, color in function_data:
        func = MagicMock(spec=FrameworkFunction)
        func.id = _make_uuid()
        func.framework_id = framework_id
        func.code = code
        func.name = name
        func.description = description
        func.display_order = order
        func.color_hex = color
        func.icon_name = f"icon_{code}"
        functions.append(func)

    return functions


def create_sample_categories(function_map=None):
    """Create sample FrameworkCategory objects for testing.

    Args:
        function_map: Optional dict mapping function codes to function IDs.

    Returns:
        list[FrameworkCategory]: Categories spanning multiple CSF functions.
    """
    if function_map is None:
        function_map = {
            "gv": _make_uuid(),
            "id": _make_uuid(),
            "pr": _make_uuid(),
            "de": _make_uuid(),
            "rs": _make_uuid(),
            "rc": _make_uuid(),
        }

    category_data = [
        ("GV.OC", "Organizational Context", "gv", 0),
        ("GV.RM", "Risk Management Strategy", "gv", 1),
        ("GV.SC", "Cybersecurity Supply Chain Risk Management", "gv", 2),
        ("ID.AM", "Asset Management", "id", 0),
        ("ID.RA", "Risk Assessment", "id", 1),
        ("PR.AA", "Identity Management, Authentication, and Access Control", "pr", 0),
        ("PR.AT", "Awareness and Training", "pr", 1),
        ("PR.DS", "Data Security", "pr", 2),
        ("PR.PS", "Platform Security", "pr", 3),
        ("DE.CM", "Continuous Monitoring", "de", 0),
        ("DE.AE", "Adverse Event Analysis", "de", 1),
        ("RS.MA", "Incident Management", "rs", 0),
        ("RS.AN", "Incident Analysis", "rs", 1),
        ("RC.RP", "Incident Recovery Plan Execution", "rc", 0),
        ("RC.CO", "Incident Recovery Communication", "rc", 1),
    ]

    categories = []
    for code, name, func_code, order in category_data:
        cat = MagicMock(spec=FrameworkCategory)
        cat.id = _make_uuid()
        cat.function_id = function_map.get(func_code, _make_uuid())
        cat.code = code
        cat.name = name
        cat.description = f"Category for {name}"
        cat.display_order = order
        categories.append(cat)

    return categories


def create_sample_subcategories(category_map=None):
    """Create sample FrameworkSubcategory objects for testing.

    Args:
        category_map: Optional dict mapping category codes to category IDs.

    Returns:
        list[FrameworkSubcategory]: Subcategories for testing.
    """
    if category_map is None:
        category_map = {}

    subcat_data = [
        ("PR.AA-01", "PR.AA", "Identities and credentials for authorized users, services, and hardware are managed by the organization"),
        ("PR.AA-03", "PR.AA", "Users, services, and hardware are authenticated"),
        ("PR.PS-02", "PR.PS", "Software is maintained, replaced, and removed commensurate with risk"),
        ("DE.CM-01", "DE.CM", "Networks and network services are monitored to find potentially adverse events"),
        ("RS.MA-01", "RS.MA", "The incident response plan is executed in coordination with relevant third parties once an incident is declared"),
    ]

    subcategories = []
    for code, cat_code, outcome in subcat_data:
        subcat = MagicMock(spec=FrameworkSubcategory)
        subcat.id = _make_uuid()
        subcat.category_id = category_map.get(cat_code, _make_uuid())
        subcat.code = code
        subcat.outcome = outcome
        subcat.display_order = 0
        subcategories.append(subcat)

    return subcategories


def create_sample_metrics(framework_id=None, function_ids=None):
    """Create a list of sample Metric objects for testing.

    Args:
        framework_id: Optional framework UUID.
        function_ids: Optional dict mapping function codes to UUIDs.

    Returns:
        list[Metric]: Metrics across multiple CSF functions.
    """
    if framework_id is None:
        framework_id = _make_uuid()
    if function_ids is None:
        function_ids = {
            "gv": _make_uuid(),
            "pr": _make_uuid(),
            "de": _make_uuid(),
            "rs": _make_uuid(),
        }

    metrics_data = [
        {
            "name": "Board Cybersecurity Briefing Frequency",
            "description": "Number of cybersecurity briefings delivered to the board per year",
            "metric_number": "CSF-GV-001",
            "function_code": "gv",
            "direction": MetricDirection.HIGHER_IS_BETTER,
            "target_value": 4.0,
            "current_value": 3.0,
            "target_units": "count",
            "priority_rank": 1,
            "collection_frequency": CollectionFrequency.QUARTERLY,
            "owner_function": "CISO",
        },
        {
            "name": "MFA Adoption Rate",
            "description": "Percentage of user accounts with MFA enabled",
            "metric_number": "CSF-PR-001",
            "function_code": "pr",
            "direction": MetricDirection.HIGHER_IS_BETTER,
            "target_value": 95.0,
            "current_value": 85.0,
            "target_units": "%",
            "priority_rank": 1,
            "collection_frequency": CollectionFrequency.WEEKLY,
            "owner_function": "IAM",
        },
        {
            "name": "Mean Time to Detect (MTTD)",
            "description": "Average time to detect security incidents in hours",
            "metric_number": "CSF-DE-001",
            "function_code": "de",
            "direction": MetricDirection.LOWER_IS_BETTER,
            "target_value": 4.0,
            "current_value": 6.3,
            "target_units": "hours",
            "priority_rank": 1,
            "collection_frequency": CollectionFrequency.DAILY,
            "owner_function": "SecOps",
        },
        {
            "name": "Mean Time to Respond (MTTR)",
            "description": "Average time to respond to security incidents in hours",
            "metric_number": "CSF-RS-001",
            "function_code": "rs",
            "direction": MetricDirection.LOWER_IS_BETTER,
            "target_value": 2.0,
            "current_value": 3.5,
            "target_units": "hours",
            "priority_rank": 1,
            "collection_frequency": CollectionFrequency.DAILY,
            "owner_function": "IR",
        },
        {
            "name": "Encryption Coverage",
            "description": "Percentage of sensitive data encrypted at rest and in transit",
            "metric_number": "CSF-PR-002",
            "function_code": "pr",
            "direction": MetricDirection.HIGHER_IS_BETTER,
            "target_value": 100.0,
            "current_value": 92.0,
            "target_units": "%",
            "priority_rank": 2,
            "collection_frequency": CollectionFrequency.MONTHLY,
            "owner_function": "IT Ops",
        },
    ]

    metrics = []
    for data in metrics_data:
        metric = MagicMock(spec=Metric)
        metric.id = _make_uuid()
        metric.framework_id = framework_id
        metric.function_id = function_ids.get(data["function_code"], _make_uuid())
        metric.category_id = _make_uuid()
        metric.subcategory_id = None
        metric.name = data["name"]
        metric.description = data["description"]
        metric.metric_number = data["metric_number"]
        metric.formula = None
        metric.direction = data["direction"]
        metric.target_value = data["target_value"]
        metric.current_value = data["current_value"]
        metric.target_units = data["target_units"]
        metric.priority_rank = data["priority_rank"]
        metric.collection_frequency = data["collection_frequency"]
        metric.owner_function = data["owner_function"]
        metric.active = True
        metric.locked = False
        metric.weight = 1.0
        metric.notes = None
        metric.risk_definition = None
        metric.created_at = datetime.utcnow()
        metric.updated_at = datetime.utcnow()

        # Set backward-compat properties
        func_mock = MagicMock()
        func_mock.code = data["function_code"]
        func_mock.value = data["function_code"]
        metric.function = func_mock

        try:
            metric.csf_function = CSFFunction(data["function_code"])
        except (ValueError, KeyError):
            metric.csf_function = None

        metrics.append(metric)

    return metrics


def create_sample_function_scores():
    """Create FunctionScore objects for report generation tests.

    Returns:
        list[FunctionScore]: Scores for all six CSF functions.
    """
    scores_data = [
        (CSFFunction.GOVERN, 82.1, RiskRating.LOW, 36, 5, 0.821),
        (CSFFunction.IDENTIFY, 76.4, RiskRating.MEDIUM, 35, 8, 0.764),
        (CSFFunction.PROTECT, 68.2, RiskRating.MEDIUM, 44, 14, 0.682),
        (CSFFunction.DETECT, 61.5, RiskRating.MEDIUM, 32, 12, 0.615),
        (CSFFunction.RESPOND, 71.8, RiskRating.MEDIUM, 30, 9, 0.718),
        (CSFFunction.RECOVER, 78.9, RiskRating.MEDIUM, 31, 6, 0.789),
    ]

    return [
        FunctionScore(
            function=func,
            score_pct=score,
            risk_rating=rating,
            metrics_count=count,
            metrics_below_target_count=below,
            weighted_score=weighted,
        )
        for func, score, rating, count, below, weighted in scores_data
    ]
