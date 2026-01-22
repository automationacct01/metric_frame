"""Multi-framework catalog-aware scoring service.

Works with both default metrics and custom catalogs, supporting:
- NIST CSF 2.0 (with Cyber AI Profile)
- NIST AI RMF 1.0
- Future frameworks via database
"""

import os
from typing import Dict, List, Optional, Tuple, Union, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from uuid import UUID

from ..models import (
    Metric, MetricCatalog, MetricCatalogItem, MetricCatalogCSFMapping,
    CSFFunction, MetricDirection, Framework, FrameworkFunction, FrameworkCategory
)
from ..schemas import FunctionScore, RiskRating
from .csf_reference import CSFReferenceService


class CatalogScoringService:
    """Unified scoring service supporting both default metrics and custom catalogs."""
    
    def __init__(self, db: Session):
        self.db = db
        self.csf_service = CSFReferenceService()
    
    def get_active_catalog_id(self, owner: Optional[str] = None) -> Optional[UUID]:
        """Get the active catalog ID for the given owner."""
        query = self.db.query(MetricCatalog).filter(MetricCatalog.active == True)
        
        if owner:
            query = query.filter(MetricCatalog.owner == owner)
        
        catalog = query.first()
        return catalog.id if catalog else None
    
    def get_metrics_for_scoring(
        self, 
        catalog_id: Optional[UUID] = None,
        csf_function: Optional[CSFFunction] = None
    ) -> List[Dict]:
        """
        Get metrics for scoring from either default table or catalog.
        Returns normalized metric dictionaries.
        """
        if catalog_id:
            return self._get_catalog_metrics(catalog_id, csf_function)
        else:
            return self._get_default_metrics(csf_function)
    
    def _get_default_metrics(self, csf_function: Optional[CSFFunction] = None) -> List[Dict]:
        """Get metrics from the default metrics table."""
        query = self.db.query(Metric).filter(Metric.active == True)

        if csf_function:
            query = query.join(FrameworkFunction, Metric.function_id == FrameworkFunction.id)
            query = query.filter(FrameworkFunction.code == csf_function.value)

        metrics = query.all()

        # Normalize to common format
        normalized_metrics = []
        for metric in metrics:
            normalized_metrics.append({
                'id': str(metric.id),
                'name': metric.name,
                'description': metric.description,
                'csf_function': CSFFunction(metric.function.code) if metric.function and metric.function.code in [f.value for f in CSFFunction] else None,
                'csf_category_code': metric.category.code if metric.category else None,
                'csf_subcategory_code': metric.subcategory.code if metric.subcategory else None,
                'csf_category_name': metric.category.name if metric.category else None,
                'direction': metric.direction,
                'target_value': metric.target_value,
                'tolerance_low': metric.tolerance_low,
                'tolerance_high': metric.tolerance_high,
                'current_value': metric.current_value,
                'weight': metric.weight or 1.0,
                'priority_rank': metric.priority_rank or 2,
                'active': metric.active,
                'source': 'default'
            })
        
        return normalized_metrics
    
    def _get_catalog_metrics(
        self, 
        catalog_id: UUID, 
        csf_function: Optional[CSFFunction] = None
    ) -> List[Dict]:
        """Get metrics from a custom catalog with CSF mappings."""
        # Join catalog items with their CSF mappings
        query = (
            self.db.query(MetricCatalogItem, MetricCatalogCSFMapping)
            .join(
                MetricCatalogCSFMapping,
                MetricCatalogItem.id == MetricCatalogCSFMapping.catalog_item_id
            )
            .filter(MetricCatalogItem.catalog_id == catalog_id)
        )
        
        if csf_function:
            query = query.filter(MetricCatalogCSFMapping.csf_function == csf_function)
        
        results = query.all()
        
        # Normalize to common format
        normalized_metrics = []
        for item, mapping in results:
            normalized_metrics.append({
                'id': str(item.id),
                'name': item.name,
                'description': item.description,
                'csf_function': mapping.csf_function,
                'csf_category_code': mapping.csf_category_code,
                'csf_subcategory_code': mapping.csf_subcategory_code,
                'csf_category_name': mapping.csf_category_name,
                'direction': item.direction,
                'target_value': item.target_value,
                'tolerance_low': item.tolerance_low,
                'tolerance_high': item.tolerance_high,
                'current_value': item.current_value,
                'weight': item.weight or 1.0,
                'priority_rank': item.priority_rank or 2,
                'active': True,  # Catalog items are active if they have mappings
                'source': 'catalog',
                'catalog_id': str(catalog_id)
            })
        
        return normalized_metrics
    
    def compute_metric_score(self, metric_data: Dict) -> Optional[float]:
        """
        Compute performance score for a metric using normalized data.
        Same logic as the original compute_metric_score function.
        """
        current = metric_data.get('current_value')
        if current is None or not metric_data.get('active', True):
            return None
        
        current = float(current)
        target = metric_data.get('target_value')
        target = float(target) if target is not None else None
        direction = metric_data.get('direction')
        
        if direction == MetricDirection.BINARY:
            return 1.0 if bool(current) else 0.0
        
        if target is None:
            return None
        
        if direction == MetricDirection.HIGHER_IS_BETTER:
            score = min(1.0, max(0.0, current / target)) if target > 0 else 0.0
        elif direction == MetricDirection.LOWER_IS_BETTER:
            if target == 0:
                score = 1.0 if current == 0 else 0.0
            else:
                score = max(0.0, min(1.0, 1.0 - (current / target)))
        elif direction == MetricDirection.TARGET_RANGE:
            low = float(metric_data.get('tolerance_low', target))
            high = float(metric_data.get('tolerance_high', target))
            
            if low <= current <= high:
                score = 1.0
            else:
                distance = min(abs(current - low), abs(current - high))
                range_span = max(high - low, 1.0)
                penalty_factor = min(2.0, distance / range_span)
                score = max(0.0, 1.0 - penalty_factor)
        else:
            return None
        
        return score
    
    def compute_function_scores(
        self, 
        catalog_id: Optional[UUID] = None,
        owner: Optional[str] = None
    ) -> List[FunctionScore]:
        """
        Compute scores for all CSF functions using either default metrics or catalog.
        """
        # If no catalog_id provided, try to get active catalog for owner
        if catalog_id is None and owner:
            catalog_id = self.get_active_catalog_id(owner)
        
        function_scores = []
        
        for csf_function in CSFFunction:
            # Get metrics for this function
            metrics = self.get_metrics_for_scoring(catalog_id, csf_function)
            
            if not metrics:
                function_scores.append(FunctionScore(
                    function=csf_function,
                    score_pct=0.0,
                    risk_rating=RiskRating.VERY_HIGH,
                    metrics_count=0,
                    metrics_below_target_count=0,
                    weighted_score=0.0,
                ))
                continue
            
            # Compute weighted score
            total_weight = 0.0
            weighted_sum = 0.0
            metrics_below_target = 0
            scoreable_metrics = 0
            
            for metric_data in metrics:
                weight = float(metric_data.get('weight', 1.0))
                score = self.compute_metric_score(metric_data)
                
                if score is not None:
                    scoreable_metrics += 1
                    total_weight += weight
                    weighted_sum += score * weight
                    
                    if score < 0.9:
                        metrics_below_target += 1
            
            if total_weight == 0 or scoreable_metrics == 0:
                weighted_score = 0.0
                score_pct = 0.0
            else:
                weighted_score = weighted_sum / total_weight
                score_pct = weighted_score * 100
            
            risk_rating = self._get_risk_rating(score_pct)
            
            function_scores.append(FunctionScore(
                function=csf_function,
                score_pct=round(score_pct, 1),
                risk_rating=risk_rating,
                metrics_count=len(metrics),
                metrics_below_target_count=metrics_below_target,
                weighted_score=round(weighted_score, 3),
            ))
        
        return function_scores
    
    def compute_category_scores(
        self,
        function_code: str,
        catalog_id: Optional[UUID] = None,
        owner: Optional[str] = None
    ) -> List[Dict]:
        """
        Compute scores for categories within a CSF function.
        """
        try:
            csf_function = CSFFunction(function_code)
        except ValueError:
            return []
        
        # If no catalog_id provided, try to get active catalog for owner
        if catalog_id is None and owner:
            catalog_id = self.get_active_catalog_id(owner)
        
        # Get metrics for this function
        metrics = self.get_metrics_for_scoring(catalog_id, csf_function)
        
        if not metrics:
            return []
        
        # Group metrics by category
        category_groups = {}
        for metric_data in metrics:
            category_code = metric_data.get('csf_category_code')
            if not category_code:
                continue
                
            if category_code not in category_groups:
                category_groups[category_code] = {
                    'code': category_code,
                    'name': metric_data.get('csf_category_name', category_code),
                    'description': self._get_category_description(category_code),
                    'metrics': []
                }
            category_groups[category_code]['metrics'].append(metric_data)
        
        # Compute scores for each category
        category_scores = []
        for category_code, category_data in category_groups.items():
            metrics_list = category_data['metrics']
            
            total_weight = 0.0
            weighted_sum = 0.0
            metrics_below_target = 0
            scoreable_metrics = 0
            
            for metric_data in metrics_list:
                weight = float(metric_data.get('weight', 1.0))
                score = self.compute_metric_score(metric_data)
                
                if score is not None:
                    scoreable_metrics += 1
                    total_weight += weight
                    weighted_sum += score * weight
                    
                    if score < 0.9:
                        metrics_below_target += 1
            
            if total_weight == 0 or scoreable_metrics == 0:
                weighted_score = 0.0
                score_pct = 0.0
            else:
                weighted_score = weighted_sum / total_weight
                score_pct = weighted_score * 100
            
            risk_rating = self._get_risk_rating(score_pct)
            
            category_scores.append({
                'category_code': category_code,
                'category_name': category_data['name'],
                'category_description': category_data['description'],
                'score_pct': round(score_pct, 1),
                'risk_rating': risk_rating.value,
                'metrics_count': len(metrics_list),
                'metrics_below_target_count': metrics_below_target,
                'weighted_score': round(weighted_score, 3),
            })
        
        category_scores.sort(key=lambda x: x['category_code'])
        return category_scores
    
    def _get_category_description(self, category_code: str) -> Optional[str]:
        """Get category description from CSF reference service."""
        try:
            csf_category = self.csf_service.get_category(category_code)
            return csf_category.description if csf_category else None
        except:
            return None
    
    def _get_risk_rating(self, score_pct: float) -> RiskRating:
        """Map function score percentage to risk rating."""
        threshold_very_low = float(os.getenv("RISK_THRESHOLD_VERY_LOW", "90.0"))
        threshold_low = float(os.getenv("RISK_THRESHOLD_LOW", "75.0"))
        threshold_medium = float(os.getenv("RISK_THRESHOLD_MEDIUM", "50.0"))
        threshold_high = float(os.getenv("RISK_THRESHOLD_HIGH", "30.0"))
        
        if score_pct >= threshold_very_low:
            return RiskRating.VERY_LOW
        elif score_pct >= threshold_low:
            return RiskRating.LOW
        elif score_pct >= threshold_medium:
            return RiskRating.MEDIUM
        elif score_pct >= threshold_high:
            return RiskRating.HIGH
        else:
            return RiskRating.VERY_HIGH


    # ===========================================================================
    # MULTI-FRAMEWORK SCORING METHODS
    # ===========================================================================

    def compute_framework_function_scores(
        self,
        framework_code: str,
        catalog_id: Optional[UUID] = None,
        owner: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Compute scores for all functions in a specific framework.

        Args:
            framework_code: Framework code (e.g., 'csf_2_0', 'ai_rmf')
            catalog_id: Optional catalog ID to use
            owner: Optional owner for active catalog lookup

        Returns:
            List of function score dictionaries
        """
        # If no catalog_id provided, try to get active catalog for owner
        if catalog_id is None and owner:
            catalog_id = self.get_active_catalog_id(owner)

        # For CSF 2.0, use existing logic
        if framework_code == "csf_2_0":
            scores = self.compute_function_scores(catalog_id, owner)
            return [
                {
                    "function_code": fs.function.value,
                    "function_name": self._get_function_name(fs.function.value),
                    "score_pct": fs.score_pct,
                    "risk_rating": fs.risk_rating.value,
                    "metrics_count": fs.metrics_count,
                    "metrics_below_target_count": fs.metrics_below_target_count,
                    "weighted_score": fs.weighted_score,
                }
                for fs in scores
            ]

        # For other frameworks, use framework tables
        framework = self.db.query(Framework).filter(
            Framework.code == framework_code,
            Framework.active == True
        ).first()

        if not framework:
            return []

        functions = self.db.query(FrameworkFunction).filter(
            FrameworkFunction.framework_id == framework.id
        ).order_by(FrameworkFunction.display_order).all()

        function_scores = []

        for func in functions:
            # Get metrics for this function from catalog or defaults
            if catalog_id:
                metrics = self._get_framework_catalog_metrics(catalog_id, framework_code, func.code)
            else:
                metrics = self._get_framework_default_metrics(framework.id, func.id)

            if not metrics:
                function_scores.append({
                    "function_code": func.code,
                    "function_name": func.name,
                    "function_description": func.description,
                    "score_pct": 0.0,
                    "risk_rating": RiskRating.VERY_HIGH.value,
                    "metrics_count": 0,
                    "metrics_below_target_count": 0,
                    "weighted_score": 0.0,
                })
                continue

            # Compute weighted score
            total_weight = 0.0
            weighted_sum = 0.0
            metrics_below_target = 0
            scoreable_metrics = 0

            for metric_data in metrics:
                weight = float(metric_data.get('weight', 1.0))
                score = self.compute_metric_score(metric_data)

                if score is not None:
                    scoreable_metrics += 1
                    total_weight += weight
                    weighted_sum += score * weight

                    if score < 0.9:
                        metrics_below_target += 1

            if total_weight == 0 or scoreable_metrics == 0:
                weighted_score = 0.0
                score_pct = 0.0
            else:
                weighted_score = weighted_sum / total_weight
                score_pct = weighted_score * 100

            risk_rating = self._get_risk_rating(score_pct)

            function_scores.append({
                "function_code": func.code,
                "function_name": func.name,
                "function_description": func.description,
                "score_pct": round(score_pct, 1),
                "risk_rating": risk_rating.value,
                "metrics_count": len(metrics),
                "metrics_below_target_count": metrics_below_target,
                "weighted_score": round(weighted_score, 3),
            })

        return function_scores

    def _get_framework_default_metrics(
        self,
        framework_id: UUID,
        function_id: UUID
    ) -> List[Dict]:
        """Get default metrics for a framework function."""
        metrics = self.db.query(Metric).filter(
            Metric.framework_id == framework_id,
            Metric.function_id == function_id,
            Metric.active == True
        ).all()

        return [
            {
                'id': str(m.id),
                'name': m.name,
                'direction': m.direction,
                'target_value': m.target_value,
                'tolerance_low': m.tolerance_low,
                'tolerance_high': m.tolerance_high,
                'current_value': m.current_value,
                'weight': m.weight or 1.0,
                'priority_rank': m.priority_rank or 2,
                'active': m.active,
                'source': 'default'
            }
            for m in metrics
        ]

    def _get_framework_catalog_metrics(
        self,
        catalog_id: UUID,
        framework_code: str,
        function_code: str
    ) -> List[Dict]:
        """Get catalog metrics for a framework function."""
        # For now, catalog metrics use CSF mappings
        # Future: Add support for other framework mappings

        if framework_code == "csf_2_0":
            try:
                csf_func = CSFFunction(function_code)
                return self._get_catalog_metrics(catalog_id, csf_func)
            except ValueError:
                return []

        # For other frameworks, return empty for now
        # TODO: Add framework-specific catalog mapping tables
        return []

    def _get_function_name(self, function_code: str) -> str:
        """Get function name from code for CSF 2.0."""
        names = {
            "gv": "Govern",
            "id": "Identify",
            "pr": "Protect",
            "de": "Detect",
            "rs": "Respond",
            "rc": "Recover"
        }
        return names.get(function_code, function_code.upper())

    def compute_framework_overall_score(
        self,
        framework_code: str,
        catalog_id: Optional[UUID] = None,
        owner: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compute overall score for a framework with catalog support.

        Args:
            framework_code: Framework code
            catalog_id: Optional catalog ID
            owner: Optional owner for active catalog lookup

        Returns:
            Dictionary with overall score and breakdown
        """
        function_scores = self.compute_framework_function_scores(
            framework_code, catalog_id, owner
        )

        if not function_scores:
            return {
                "framework_code": framework_code,
                "overall_score_pct": 0.0,
                "overall_risk_rating": RiskRating.VERY_HIGH.value,
                "total_metrics_count": 0,
                "function_scores": [],
                "catalog_id": str(catalog_id) if catalog_id else None,
            }

        # Filter out functions with no metrics
        valid_scores = [fs for fs in function_scores if fs["metrics_count"] > 0]

        if not valid_scores:
            return {
                "framework_code": framework_code,
                "overall_score_pct": 0.0,
                "overall_risk_rating": RiskRating.VERY_HIGH.value,
                "total_metrics_count": 0,
                "function_scores": function_scores,
                "catalog_id": str(catalog_id) if catalog_id else None,
            }

        # Calculate overall score
        total_weighted_score = sum(fs["weighted_score"] for fs in valid_scores)
        overall_weighted_score = total_weighted_score / len(valid_scores)
        overall_score_pct = overall_weighted_score * 100
        overall_risk_rating = self._get_risk_rating(overall_score_pct)

        total_metrics = sum(fs["metrics_count"] for fs in function_scores)

        return {
            "framework_code": framework_code,
            "overall_score_pct": round(overall_score_pct, 1),
            "overall_risk_rating": overall_risk_rating.value,
            "total_metrics_count": total_metrics,
            "function_scores": function_scores,
            "catalog_id": str(catalog_id) if catalog_id else None,
        }


def get_catalog_scoring_service(db: Session) -> CatalogScoringService:
    """Factory function to get catalog scoring service instance."""
    return CatalogScoringService(db)