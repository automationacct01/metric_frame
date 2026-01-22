"""Multi-framework reference data service.

Provides unified access to framework hierarchies (functions, categories, subcategories)
for both NIST CSF 2.0 (with Cyber AI Profile) and NIST AI RMF 1.0.

Data is loaded from the database framework tables populated during seeding.
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from sqlalchemy.orm import Session

from ..models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    FrameworkSubcategory,
    FrameworkCrossMapping,
)


@dataclass
class SubcategoryInfo:
    """Subcategory information."""
    id: str
    code: str
    outcome: str
    category_id: str
    category_code: str
    category_name: str
    function_id: str
    function_code: str
    function_name: str
    display_order: int = 0


@dataclass
class CategoryInfo:
    """Category information."""
    id: str
    code: str
    name: str
    description: str
    function_id: str
    function_code: str
    function_name: str
    display_order: int = 0
    subcategories: List[SubcategoryInfo] = field(default_factory=list)


@dataclass
class FunctionInfo:
    """Function information."""
    id: str
    code: str
    name: str
    description: str
    framework_id: str
    framework_code: str
    display_order: int = 0
    color_hex: Optional[str] = None
    icon_name: Optional[str] = None
    categories: List[CategoryInfo] = field(default_factory=list)


@dataclass
class FrameworkInfo:
    """Framework information."""
    id: str
    code: str
    name: str
    version: str
    description: str
    active: bool
    functions: List[FunctionInfo] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class FrameworkReferenceService:
    """Service for working with multi-framework reference data.

    Supports:
    - NIST CSF 2.0 (with integrated Cyber AI Profile)
    - NIST AI RMF 1.0
    - Future frameworks via database
    """

    def __init__(self, db: Session):
        """Initialize the service with database session."""
        self.db = db
        self._frameworks: Dict[str, FrameworkInfo] = {}
        self._functions: Dict[str, FunctionInfo] = {}
        self._categories: Dict[str, CategoryInfo] = {}
        self._subcategories: Dict[str, SubcategoryInfo] = {}

    def load_framework(self, framework_code: str) -> Optional[FrameworkInfo]:
        """Load a framework and its complete hierarchy from the database."""

        framework = self.db.query(Framework).filter(
            Framework.code == framework_code,
            Framework.active == True
        ).first()

        if not framework:
            return None

        framework_info = FrameworkInfo(
            id=str(framework.id),
            code=framework.code,
            name=framework.name,
            version=framework.version or "",
            description=framework.description or "",
            active=framework.active,
            metadata=framework.metadata_ or {}
        )

        # Load functions
        functions = self.db.query(FrameworkFunction).filter(
            FrameworkFunction.framework_id == framework.id
        ).order_by(FrameworkFunction.display_order).all()

        for func in functions:
            function_info = FunctionInfo(
                id=str(func.id),
                code=func.code,
                name=func.name,
                description=func.description or "",
                framework_id=str(framework.id),
                framework_code=framework.code,
                display_order=func.display_order or 0,
                color_hex=func.color_hex,
                icon_name=func.icon_name
            )

            # Load categories for this function
            categories = self.db.query(FrameworkCategory).filter(
                FrameworkCategory.function_id == func.id
            ).order_by(FrameworkCategory.display_order).all()

            for cat in categories:
                category_info = CategoryInfo(
                    id=str(cat.id),
                    code=cat.code,
                    name=cat.name,
                    description=cat.description or "",
                    function_id=str(func.id),
                    function_code=func.code,
                    function_name=func.name,
                    display_order=cat.display_order or 0
                )

                # Load subcategories for this category
                subcategories = self.db.query(FrameworkSubcategory).filter(
                    FrameworkSubcategory.category_id == cat.id
                ).order_by(FrameworkSubcategory.display_order).all()

                for sub in subcategories:
                    subcategory_info = SubcategoryInfo(
                        id=str(sub.id),
                        code=sub.code,
                        outcome=sub.outcome,
                        category_id=str(cat.id),
                        category_code=cat.code,
                        category_name=cat.name,
                        function_id=str(func.id),
                        function_code=func.code,
                        function_name=func.name,
                        display_order=sub.display_order or 0
                    )
                    category_info.subcategories.append(subcategory_info)
                    self._subcategories[sub.code] = subcategory_info

                function_info.categories.append(category_info)
                self._categories[cat.code] = category_info

            framework_info.functions.append(function_info)
            self._functions[func.code] = function_info

        self._frameworks[framework_code] = framework_info
        return framework_info

    def get_framework(self, framework_code: str) -> Optional[FrameworkInfo]:
        """Get framework info, loading from DB if not cached."""
        if framework_code not in self._frameworks:
            self.load_framework(framework_code)
        return self._frameworks.get(framework_code)

    def get_function(self, function_code: str, framework_code: Optional[str] = None) -> Optional[FunctionInfo]:
        """Get function by code."""
        if framework_code and framework_code not in self._frameworks:
            self.load_framework(framework_code)
        return self._functions.get(function_code)

    def get_category(self, category_code: str, framework_code: Optional[str] = None) -> Optional[CategoryInfo]:
        """Get category by code."""
        if framework_code and framework_code not in self._frameworks:
            self.load_framework(framework_code)
        return self._categories.get(category_code)

    def get_subcategory(self, subcategory_code: str, framework_code: Optional[str] = None) -> Optional[SubcategoryInfo]:
        """Get subcategory by code."""
        if framework_code and framework_code not in self._frameworks:
            self.load_framework(framework_code)
        return self._subcategories.get(subcategory_code)

    def list_frameworks(self, active_only: bool = True) -> List[FrameworkInfo]:
        """List all available frameworks."""
        query = self.db.query(Framework)
        if active_only:
            query = query.filter(Framework.active == True)

        frameworks = query.order_by(Framework.code).all()
        result = []

        for fw in frameworks:
            info = self.get_framework(fw.code)
            if info:
                result.append(info)

        return result

    def list_functions(self, framework_code: str) -> List[FunctionInfo]:
        """List all functions for a framework."""
        framework = self.get_framework(framework_code)
        return framework.functions if framework else []

    def list_categories(
        self,
        framework_code: str,
        function_code: Optional[str] = None
    ) -> List[CategoryInfo]:
        """List categories, optionally filtered by function."""
        framework = self.get_framework(framework_code)
        if not framework:
            return []

        if function_code:
            func = next((f for f in framework.functions if f.code == function_code), None)
            return func.categories if func else []

        # Return all categories across all functions
        categories = []
        for func in framework.functions:
            categories.extend(func.categories)
        return categories

    def list_subcategories(
        self,
        framework_code: str,
        function_code: Optional[str] = None,
        category_code: Optional[str] = None
    ) -> List[SubcategoryInfo]:
        """List subcategories, optionally filtered by function or category."""
        framework = self.get_framework(framework_code)
        if not framework:
            return []

        subcategories = []

        for func in framework.functions:
            if function_code and func.code != function_code:
                continue

            for cat in func.categories:
                if category_code and cat.code != category_code:
                    continue

                subcategories.extend(cat.subcategories)

        return subcategories

    def validate_category_code(self, code: str, framework_code: str) -> bool:
        """Validate if a category code exists in the framework."""
        self.get_framework(framework_code)
        return code in self._categories

    def validate_subcategory_code(self, code: str, framework_code: str) -> bool:
        """Validate if a subcategory code exists in the framework."""
        self.get_framework(framework_code)
        return code in self._subcategories

    def validate_category_subcategory_pair(
        self,
        category_code: str,
        subcategory_code: str,
        framework_code: str
    ) -> bool:
        """Validate if category and subcategory codes form a valid pair."""
        subcategory = self.get_subcategory(subcategory_code, framework_code)
        if not subcategory:
            return False
        return subcategory.category_code == category_code

    def get_category_codes_for_function(self, function_code: str, framework_code: str) -> List[str]:
        """Get all category codes for a given function."""
        func = self.get_function(function_code, framework_code)
        return [cat.code for cat in func.categories] if func else []

    def get_subcategory_codes_for_category(self, category_code: str, framework_code: str) -> List[str]:
        """Get all subcategory codes for a given category."""
        cat = self.get_category(category_code, framework_code)
        return [sub.code for sub in cat.subcategories] if cat else []

    def suggest_category_for_metric(
        self,
        metric_name: str,
        metric_description: str,
        framework_code: str
    ) -> List[Tuple[str, str, float]]:
        """Suggest appropriate categories for a metric based on name and description.

        Returns list of tuples: (category_code, category_name, confidence_score)
        """
        text = f"{metric_name} {metric_description}".lower()
        suggestions = []

        framework = self.get_framework(framework_code)
        if not framework:
            return []

        # Define keyword mappings for different frameworks
        if framework_code == "csf_2_0":
            category_keywords = self._get_csf_category_keywords()
        elif framework_code == "ai_rmf":
            category_keywords = self._get_ai_rmf_category_keywords()
        else:
            category_keywords = {}

        for category_code, keywords in category_keywords.items():
            score = 0.0
            keyword_matches = 0

            for keyword in keywords:
                if keyword in text:
                    score += 1.0
                    keyword_matches += 1

            if keyword_matches > 0:
                confidence = min(score / len(keywords), 1.0)
                category = self.get_category(category_code, framework_code)
                if category:
                    suggestions.append((category_code, category.name, confidence))

        suggestions.sort(key=lambda x: x[2], reverse=True)
        return suggestions[:5]

    def _get_csf_category_keywords(self) -> Dict[str, List[str]]:
        """Get keyword mappings for CSF 2.0 categories."""
        return {
            # Govern categories
            "GV.OC": ["mission", "organizational", "structure", "legal", "regulatory", "compliance", "stakeholder"],
            "GV.RM": ["risk management", "risk appetite", "strategy", "threat intelligence", "vulnerability"],
            "GV.RR": ["roles", "responsibilities", "accountability", "governance"],
            "GV.PO": ["policy", "procedures", "standards"],
            "GV.OV": ["oversight", "review", "assessment", "audit", "performance"],
            "GV.SC": ["supply chain", "vendor", "supplier", "third party", "procurement"],

            # Identify categories
            "ID.AM": ["asset", "inventory", "hardware", "software", "system", "device"],
            "ID.RA": ["risk assessment", "threat", "vulnerability", "impact", "consequence"],
            "ID.IM": ["improvement", "process", "maturity", "continuous"],

            # Protect categories
            "PR.AA": ["access", "authentication", "authorization", "identity", "credential", "privilege", "mfa", "multi-factor"],
            "PR.AT": ["training", "awareness", "education", "personnel", "staff"],
            "PR.DS": ["data", "encryption", "backup", "confidentiality", "integrity", "availability"],
            "PR.PS": ["platform", "secure", "configuration", "hardening"],
            "PR.IR": ["infrastructure", "resilience", "redundancy"],

            # Detect categories
            "DE.AE": ["anomaly", "event", "alert", "incident", "analysis"],
            "DE.CM": ["monitoring", "continuous", "surveillance", "scan"],

            # Respond categories
            "RS.MA": ["incident management", "response plan", "coordination"],
            "RS.AN": ["analysis", "investigation", "forensic", "evidence", "root cause"],
            "RS.CO": ["communication", "notification", "reporting"],
            "RS.MI": ["mitigation", "containment", "isolation"],

            # Recover categories
            "RC.RP": ["recovery plan", "restoration", "business continuity", "disaster recovery"],
            "RC.CO": ["recovery coordination", "stakeholder communication"]
        }

    def _get_ai_rmf_category_keywords(self) -> Dict[str, List[str]]:
        """Get keyword mappings for AI RMF categories."""
        return {
            # Govern categories
            "GOVERN-1": ["policy", "policies", "procedures", "documentation"],
            "GOVERN-2": ["accountability", "roles", "responsibilities", "oversight"],
            "GOVERN-3": ["workforce", "skills", "training", "competency"],
            "GOVERN-4": ["culture", "organizational", "values", "ethics"],
            "GOVERN-5": ["stakeholder", "engagement", "communication"],
            "GOVERN-6": ["legal", "regulatory", "compliance", "standards"],

            # Map categories
            "MAP-1": ["context", "purpose", "intended use", "deployment"],
            "MAP-2": ["categorization", "classification", "ai system type"],
            "MAP-3": ["benefits", "costs", "tradeoffs", "value"],
            "MAP-4": ["risks", "potential harms", "negative impacts"],
            "MAP-5": ["impacts", "affected parties", "stakeholders"],

            # Measure categories
            "MEASURE-1": ["methods", "techniques", "approaches", "testing"],
            "MEASURE-2": ["evaluation", "assessment", "validation", "verification"],
            "MEASURE-3": ["tracking", "monitoring", "metrics", "kpi"],
            "MEASURE-4": ["feedback", "input", "lessons learned"],

            # Manage categories
            "MANAGE-1": ["prioritization", "ranking", "triage"],
            "MANAGE-2": ["response", "treatment", "mitigation", "controls"],
            "MANAGE-3": ["communication", "reporting", "transparency"],
            "MANAGE-4": ["documentation", "records", "audit trail"]
        }

    def get_cross_mappings(
        self,
        source_framework: str,
        target_framework: str
    ) -> List[Dict[str, Any]]:
        """Get cross-framework mappings between two frameworks."""

        source_fw = self.db.query(Framework).filter(Framework.code == source_framework).first()
        target_fw = self.db.query(Framework).filter(Framework.code == target_framework).first()

        if not source_fw or not target_fw:
            return []

        mappings = self.db.query(FrameworkCrossMapping).filter(
            FrameworkCrossMapping.source_framework_id == source_fw.id,
            FrameworkCrossMapping.target_framework_id == target_fw.id
        ).all()

        result = []
        for mapping in mappings:
            source_sub = self.db.query(FrameworkSubcategory).filter(
                FrameworkSubcategory.id == mapping.source_subcategory_id
            ).first()
            target_sub = self.db.query(FrameworkSubcategory).filter(
                FrameworkSubcategory.id == mapping.target_subcategory_id
            ).first()

            result.append({
                "source_subcategory_code": source_sub.code if source_sub else None,
                "target_subcategory_code": target_sub.code if target_sub else None,
                "mapping_type": mapping.mapping_type,
                "confidence": float(mapping.confidence) if mapping.confidence else None,
                "notes": mapping.notes
            })

        return result

    def get_full_hierarchy(self, framework_code: str) -> Dict:
        """Get the complete framework hierarchy as a dictionary."""
        framework = self.get_framework(framework_code)
        if not framework:
            return {}

        return {
            "framework": {
                "code": framework.code,
                "name": framework.name,
                "version": framework.version,
                "description": framework.description
            },
            "functions": [
                {
                    "code": func.code,
                    "name": func.name,
                    "description": func.description,
                    "color_hex": func.color_hex,
                    "icon_name": func.icon_name,
                    "categories": [
                        {
                            "code": cat.code,
                            "name": cat.name,
                            "description": cat.description,
                            "subcategories": [
                                {
                                    "code": sub.code,
                                    "outcome": sub.outcome
                                }
                                for sub in cat.subcategories
                            ]
                        }
                        for cat in func.categories
                    ]
                }
                for func in framework.functions
            ]
        }

    def enrich_metric_with_framework_data(
        self,
        framework_code: str,
        category_code: Optional[str],
        subcategory_code: Optional[str]
    ) -> Dict[str, Optional[str]]:
        """Enrich metric with framework category name and subcategory outcome.

        Returns dictionary with category_name and subcategory_outcome.
        """
        result = {
            "category_name": None,
            "subcategory_outcome": None
        }

        if category_code:
            category = self.get_category(category_code, framework_code)
            if category:
                result["category_name"] = category.name

        if subcategory_code:
            subcategory = self.get_subcategory(subcategory_code, framework_code)
            if subcategory:
                result["subcategory_outcome"] = subcategory.outcome

        return result

    def get_framework_statistics(self, framework_code: str) -> Dict[str, int]:
        """Get statistics about a framework's structure."""
        framework = self.get_framework(framework_code)
        if not framework:
            return {}

        total_categories = 0
        total_subcategories = 0

        for func in framework.functions:
            total_categories += len(func.categories)
            for cat in func.categories:
                total_subcategories += len(cat.subcategories)

        return {
            "functions": len(framework.functions),
            "categories": total_categories,
            "subcategories": total_subcategories
        }


def get_framework_service(db: Session) -> FrameworkReferenceService:
    """Factory function to create a FrameworkReferenceService."""
    return FrameworkReferenceService(db)
