#!/usr/bin/env python3
"""Backfill existing metrics with CSF category and subcategory data."""

import sys
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from db import SessionLocal
from models import Metric
from services.csf_reference import csf_service


def backfill_csf_data():
    """Backfill existing metrics with CSF category and subcategory data."""
    
    db: Session = SessionLocal()
    
    try:
        print("🔄 Backfilling CSF data for existing metrics...")
        
        # Get metrics that don't have CSF category data
        metrics_to_update = db.query(Metric).filter(
            (Metric.csf_category_code.is_(None)) | 
            (Metric.csf_category_name.is_(None))
        ).all()
        
        print(f"  📊 Found {len(metrics_to_update)} metrics to update")
        
        updated_count = 0
        
        for metric in metrics_to_update:
            try:
                # Get category suggestions
                category_suggestions = csf_service.suggest_category_for_metric(
                    metric.name, 
                    metric.description or ""
                )
                
                # Filter suggestions by the metric's CSF function to ensure consistency
                function_categories = csf_service.get_category_codes_for_function(metric.csf_function.value)
                filtered_suggestions = [
                    (code, name, score) for code, name, score in category_suggestions 
                    if code in function_categories
                ]
                
                if filtered_suggestions:
                    # Take the highest scoring category that matches the function
                    best_category_code = filtered_suggestions[0][0]
                    
                    # Get subcategory suggestions for the best category
                    subcategory_suggestions = csf_service.suggest_subcategory_for_metric(
                        metric.name, 
                        metric.description or "", 
                        best_category_code
                    )
                    
                    best_subcategory_code = None
                    if subcategory_suggestions:
                        best_subcategory_code = subcategory_suggestions[0][0]
                    
                    # Get enriched data
                    enriched_data = csf_service.enrich_metric_with_csf_data(
                        best_category_code, 
                        best_subcategory_code
                    )
                    
                    # Update the metric
                    metric.csf_category_code = best_category_code
                    metric.csf_subcategory_code = best_subcategory_code
                    metric.csf_category_name = enriched_data.get("csf_category_name")
                    metric.csf_subcategory_outcome = enriched_data.get("csf_subcategory_outcome")
                    
                    updated_count += 1
                    print(f"  ✅ Updated {metric.name} -> {best_category_code}")
                else:
                    print(f"  ❓ No mapping found for {metric.name}")
                    
            except Exception as e:
                print(f"  ❌ Error updating {metric.name}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        
        print(f"\n✅ Backfill completed: Updated {updated_count}/{len(metrics_to_update)} metrics")
        
        # Show statistics
        total_metrics = db.query(Metric).count()
        metrics_with_categories = db.query(Metric).filter(Metric.csf_category_code.isnot(None)).count()
        metrics_with_subcategories = db.query(Metric).filter(Metric.csf_subcategory_code.isnot(None)).count()
        
        print(f"\n📈 Final Statistics:")
        print(f"  Total metrics: {total_metrics}")
        print(f"  With category codes: {metrics_with_categories} ({metrics_with_categories/total_metrics*100:.1f}%)")
        print(f"  With subcategory codes: {metrics_with_subcategories} ({metrics_with_subcategories/total_metrics*100:.1f}%)")
        
    except Exception as e:
        print(f"❌ Error during backfill: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


def main():
    """Main function to run the backfill process."""
    print("🔄 NIST CSF 2.0 Data Backfill Tool")
    print("=" * 40)
    
    try:
        backfill_csf_data()
        print("\n🎉 Backfill completed successfully!")
        
    except Exception as e:
        print(f"\n💥 Backfill failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()