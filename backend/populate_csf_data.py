#!/usr/bin/env python3
"""Simple script to populate CSF data for existing metrics."""

import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/metricframe_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def load_enhanced_csv():
    """Load the enhanced CSV with CSF mappings."""
    csv_path = "src/seeds/seed_metrics_200_enhanced.csv"
    df = pd.read_csv(csv_path)
    return df

def update_metrics_with_csf_data():
    """Update existing metrics with CSF category data."""
    session = SessionLocal()
    
    try:
        print("📊 Loading enhanced CSV data...")
        df = load_enhanced_csv()
        
        print(f"  Found {len(df)} metrics in enhanced CSV")
        
        updated_count = 0
        
        for _, row in df.iterrows():
            try:
                metric_name = row['name']
                
                # Prepare CSF data (handle NaN values)
                csf_category_code = row.get('csf_category_code')
                csf_subcategory_code = row.get('csf_subcategory_code') 
                csf_category_name = row.get('csf_category_name')
                csf_subcategory_outcome = row.get('csf_subcategory_outcome')
                
                # Convert NaN to None
                if pd.isna(csf_category_code):
                    csf_category_code = None
                if pd.isna(csf_subcategory_code):
                    csf_subcategory_code = None
                if pd.isna(csf_category_name):
                    csf_category_name = None
                if pd.isna(csf_subcategory_outcome):
                    csf_subcategory_outcome = None
                
                # Update the metric with CSF data
                query = text("""
                    UPDATE metrics 
                    SET csf_category_code = :cat_code,
                        csf_subcategory_code = :sub_code,
                        csf_category_name = :cat_name,
                        csf_subcategory_outcome = :sub_outcome
                    WHERE name = :metric_name
                """)
                
                result = session.execute(query, {
                    'cat_code': csf_category_code,
                    'sub_code': csf_subcategory_code, 
                    'cat_name': csf_category_name,
                    'sub_outcome': csf_subcategory_outcome,
                    'metric_name': metric_name
                })
                
                if result.rowcount > 0:
                    updated_count += 1
                    if csf_category_code:
                        print(f"  ✅ Updated {metric_name} -> {csf_category_code}")
                    else:
                        print(f"  ❓ Cleared CSF data for {metric_name}")
                        
            except Exception as e:
                print(f"  ❌ Error updating {metric_name}: {e}")
                continue
        
        # Commit all changes
        session.commit()
        
        print(f"\n✅ Update completed: {updated_count} metrics updated")
        
        # Show statistics
        stats_query = text("""
            SELECT 
                COUNT(*) as total_metrics,
                COUNT(csf_category_code) as with_categories,
                COUNT(csf_subcategory_code) as with_subcategories
            FROM metrics
        """)
        
        result = session.execute(stats_query).fetchone()
        
        print(f"\n📈 Final Statistics:")
        print(f"  Total metrics: {result.total_metrics}")
        print(f"  With category codes: {result.with_categories} ({result.with_categories/result.total_metrics*100:.1f}%)")
        print(f"  With subcategory codes: {result.with_subcategories} ({result.with_subcategories/result.total_metrics*100:.1f}%)")
        
    except Exception as e:
        print(f"❌ Error during update: {e}")
        session.rollback()
        raise
    
    finally:
        session.close()

if __name__ == "__main__":
    print("🔄 NIST CSF 2.0 Data Population Tool")
    print("=" * 40)
    
    try:
        update_metrics_with_csf_data()
        print("\n🎉 CSF data population completed successfully!")
        
    except Exception as e:
        print(f"\n💥 Population failed: {e}")
        sys.exit(1)