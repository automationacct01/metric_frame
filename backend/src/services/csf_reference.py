"""NIST CSF 2.0 reference data service for loading, validating, and querying CSF taxonomy."""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass

from ..models import CSFFunction as CSFModelFunction


@dataclass
class CSFSubcategory:
    """CSF Subcategory information."""
    code: str
    outcome: str
    category_code: str
    category_name: str
    function_code: str
    function_name: str


@dataclass 
class CSFCategory:
    """CSF Category information."""
    code: str
    name: str
    description: str
    function_code: str
    function_name: str
    subcategories: List[CSFSubcategory]


@dataclass
class CSFReferenceFunction:
    """CSF Function information."""
    code: str
    name: str
    description: str
    categories: List[CSFCategory]


class CSFReferenceService:
    """Service for working with NIST CSF 2.0 reference data."""
    
    def __init__(self):
        """Initialize the service and load CSF reference data."""
        self._data: Dict = {}
        self._functions: Dict[str, CSFReferenceFunction] = {}
        self._categories: Dict[str, CSFCategory] = {}
        self._subcategories: Dict[str, CSFSubcategory] = {}
        self.load_reference_data()
    
    def load_reference_data(self) -> None:
        """Load NIST CSF 2.0 reference data from JSON file."""
        data_path = Path(__file__).parent.parent / "data" / "nist_csf_2_0_reference.json"
        
        if not data_path.exists():
            raise FileNotFoundError(f"CSF reference data not found at {data_path}")
        
        with open(data_path, 'r', encoding='utf-8') as f:
            self._data = json.load(f)
        
        # Parse and organize the data for easy access
        self._parse_reference_data()
    
    def _parse_reference_data(self) -> None:
        """Parse reference data into structured objects."""
        functions_data = self._data.get("functions", {})
        
        for func_code, func_info in functions_data.items():
            categories_list = []
            categories_data = func_info.get("categories", {})
            
            for cat_code, cat_info in categories_data.items():
                subcategories_list = []
                subcategories_data = cat_info.get("subcategories", {})
                
                for subcat_code, subcat_outcome in subcategories_data.items():
                    subcategory = CSFSubcategory(
                        code=subcat_code,
                        outcome=subcat_outcome,
                        category_code=cat_code,
                        category_name=cat_info["name"],
                        function_code=func_code,
                        function_name=func_info["name"]
                    )
                    subcategories_list.append(subcategory)
                    self._subcategories[subcat_code] = subcategory
                
                category = CSFCategory(
                    code=cat_code,
                    name=cat_info["name"],
                    description=cat_info["description"],
                    function_code=func_code,
                    function_name=func_info["name"],
                    subcategories=subcategories_list
                )
                categories_list.append(category)
                self._categories[cat_code] = category
            
            function = CSFReferenceFunction(
                code=func_code,
                name=func_info["name"],
                description=func_info["description"],
                categories=categories_list
            )
            self._functions[func_code] = function
    
    def get_function(self, code: str) -> Optional[CSFReferenceFunction]:
        """Get CSF function by code."""
        return self._functions.get(code)
    
    def get_category(self, code: str) -> Optional[CSFCategory]:
        """Get CSF category by code."""
        return self._categories.get(code)
    
    def get_subcategory(self, code: str) -> Optional[CSFSubcategory]:
        """Get CSF subcategory by code."""
        return self._subcategories.get(code)
    
    def list_functions(self) -> List[CSFReferenceFunction]:
        """List all CSF functions."""
        return list(self._functions.values())
    
    def list_categories(self, function_code: Optional[str] = None) -> List[CSFCategory]:
        """List categories, optionally filtered by function."""
        if function_code:
            function = self.get_function(function_code)
            return function.categories if function else []
        return list(self._categories.values())
    
    def list_subcategories(self, 
                          function_code: Optional[str] = None,
                          category_code: Optional[str] = None) -> List[CSFSubcategory]:
        """List subcategories, optionally filtered by function or category."""
        subcategories = list(self._subcategories.values())
        
        if function_code:
            subcategories = [s for s in subcategories if s.function_code == function_code]
        
        if category_code:
            subcategories = [s for s in subcategories if s.category_code == category_code]
        
        return subcategories
    
    def validate_category_code(self, code: str) -> bool:
        """Validate if a category code exists."""
        return code in self._categories
    
    def validate_subcategory_code(self, code: str) -> bool:
        """Validate if a subcategory code exists."""
        return code in self._subcategories
    
    def validate_category_subcategory_pair(self, category_code: str, subcategory_code: str) -> bool:
        """Validate if category and subcategory codes form a valid pair."""
        subcategory = self.get_subcategory(subcategory_code)
        if not subcategory:
            return False
        return subcategory.category_code == category_code
    
    def get_category_codes_for_function(self, function_code: str) -> List[str]:
        """Get all category codes for a given function."""
        function = self.get_function(function_code)
        return [cat.code for cat in function.categories] if function else []
    
    def get_subcategory_codes_for_category(self, category_code: str) -> List[str]:
        """Get all subcategory codes for a given category."""
        category = self.get_category(category_code)
        return [sub.code for sub in category.subcategories] if category else []
    
    def suggest_category_for_metric(self, metric_name: str, metric_description: str = "") -> List[Tuple[str, str, float]]:
        """Suggest appropriate CSF categories for a metric based on name and description.
        
        Returns list of tuples: (category_code, category_name, confidence_score)
        """
        text = f"{metric_name} {metric_description}".lower()
        suggestions = []
        
        # Define keyword mappings for categories
        category_keywords = {
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
            "PR.IP": ["process", "procedure", "configuration", "change control", "development"],
            "PR.MA": ["maintenance", "repair", "update", "patch"],
            "PR.PT": ["security control", "firewall", "monitoring", "logging", "network security"],
            
            # Detect categories
            "DE.AE": ["anomaly", "event", "alert", "incident", "detection", "analysis"],
            "DE.CM": ["monitoring", "continuous", "surveillance", "scan", "assessment"],
            
            # Respond categories
            "RS.RP": ["response plan", "incident response", "coordination", "communication"],
            "RS.CO": ["communication", "notification", "reporting", "coordination"],
            "RS.AN": ["analysis", "investigation", "forensic", "evidence", "root cause"],
            "RS.MI": ["mitigation", "containment", "isolation", "recovery"],
            
            # Recover categories
            "RC.RP": ["recovery plan", "restoration", "business continuity", "disaster recovery"],
            "RC.IM": ["lessons learned", "improvement", "update"],
            "RC.CO": ["recovery coordination", "stakeholder communication"]
        }
        
        for category_code, keywords in category_keywords.items():
            score = 0.0
            keyword_matches = 0
            
            for keyword in keywords:
                if keyword in text:
                    score += 1.0
                    keyword_matches += 1
            
            if keyword_matches > 0:
                # Normalize score by number of keywords matched
                confidence = min(score / len(keywords), 1.0)
                category = self.get_category(category_code)
                if category:
                    suggestions.append((category_code, category.name, confidence))
        
        # Sort by confidence score descending
        suggestions.sort(key=lambda x: x[2], reverse=True)
        return suggestions[:5]  # Return top 5 suggestions
    
    def suggest_subcategory_for_metric(self, 
                                     metric_name: str, 
                                     metric_description: str = "",
                                     category_code: str = None) -> List[Tuple[str, str, float]]:
        """Suggest appropriate CSF subcategories for a metric.
        
        Returns list of tuples: (subcategory_code, outcome, confidence_score)
        """
        text = f"{metric_name} {metric_description}".lower()
        suggestions = []
        
        # Filter subcategories by category if provided
        subcategories = self.list_subcategories(category_code=category_code) if category_code else self.list_subcategories()
        
        for subcategory in subcategories:
            score = 0.0
            
            # Check for keyword matches in subcategory outcome
            outcome_words = set(re.findall(r'\w+', subcategory.outcome.lower()))
            text_words = set(re.findall(r'\w+', text))
            
            # Calculate word overlap
            common_words = outcome_words.intersection(text_words)
            if common_words:
                score = len(common_words) / len(outcome_words.union(text_words))
            
            if score > 0.1:  # Only include if there's meaningful overlap
                suggestions.append((subcategory.code, subcategory.outcome, score))
        
        # Sort by confidence score descending
        suggestions.sort(key=lambda x: x[2], reverse=True)
        return suggestions[:5]  # Return top 5 suggestions
    
    def get_full_hierarchy(self) -> Dict:
        """Get the complete CSF hierarchy as a dictionary."""
        return {
            "functions": [
                {
                    "code": func.code,
                    "name": func.name,
                    "description": func.description,
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
                for func in self._functions.values()
            ]
        }
    
    def enrich_metric_with_csf_data(self, category_code: Optional[str], subcategory_code: Optional[str]) -> Dict[str, Optional[str]]:
        """Enrich metric with CSF category name and subcategory outcome.
        
        Returns dictionary with csf_category_name and csf_subcategory_outcome.
        """
        result = {
            "csf_category_name": None,
            "csf_subcategory_outcome": None
        }
        
        if category_code:
            category = self.get_category(category_code)
            if category:
                result["csf_category_name"] = category.name
        
        if subcategory_code:
            subcategory = self.get_subcategory(subcategory_code)
            if subcategory:
                result["csf_subcategory_outcome"] = subcategory.outcome
        
        return result


# Global instance
csf_service = CSFReferenceService()