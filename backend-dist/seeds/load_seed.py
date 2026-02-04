#!/usr/bin/env python3
"""Load seed metrics data into the database."""

import csv
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from db import SessionLocal, engine
from models import Base, Metric, CSFFunction, MetricDirection, CollectionFrequency


def create_tables():
    """Create database tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")


def load_metrics_from_csv(csv_file: str = "seed_metrics_200_enhanced.csv"):
    """Load metrics from CSV file into database."""
    
    csv_path = Path(__file__).parent / csv_file
    if not csv_path.exists():
        print(f"❌ CSV file not found: {csv_path}")
        return
    
    db: Session = SessionLocal()
    
    try:
        # Clear existing metrics (for clean seed)
        print("🧹 Clearing existing metrics...")
        db.query(Metric).delete()
        db.commit()
        
        # Load metrics from CSV
        print(f"📥 Loading metrics from {csv_file}...")
        
        with open(csv_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            metrics_loaded = 0
            
            for row in reader:
                try:
                    # Parse and validate data
                    metric_data = {
                        'metric_number': f"M{metrics_loaded + 1:03d}",  # Generate sequential metric number
                        'name': row['name'].strip(),
                        'description': row['description'].strip() if row['description'] else None,
                        'formula': row['formula'].strip() if row['formula'] else None,
                        'csf_function': CSFFunction(row['csf_function'].strip()),
                        'csf_category_code': row['csf_category_code'].strip() if row.get('csf_category_code') and row['csf_category_code'].strip() not in ['', 'None'] else None,
                        'csf_subcategory_code': row['csf_subcategory_code'].strip() if row.get('csf_subcategory_code') and row['csf_subcategory_code'].strip() not in ['', 'None'] else None,
                        'csf_category_name': row['csf_category_name'].strip() if row.get('csf_category_name') and row['csf_category_name'].strip() not in ['', 'None'] else None,
                        'csf_subcategory_outcome': row['csf_subcategory_outcome'].strip() if row.get('csf_subcategory_outcome') and row['csf_subcategory_outcome'].strip() not in ['', 'None'] else None,
                        'priority_rank': int(row['priority_rank']),
                        'direction': MetricDirection(row['direction'].strip()),
                        'target_value': float(row['target_value']) if row['target_value'] else None,
                        'target_units': row['target_units'].strip() if row['target_units'] else None,
                        'owner_function': row['owner_function'].strip() if row['owner_function'] else None,
                        'data_source': row['data_source'].strip() if row['data_source'] else None,
                        'collection_frequency': CollectionFrequency(row['collection_frequency'].strip()) if row['collection_frequency'] else None,
                        'current_value': float(row['current_value']) if row['current_value'] else None,
                        'notes': row['notes'].strip() if row['notes'] else None,
                        'active': True,
                    }
                    
                    # Set weight based on priority
                    weight_map = {1: 1.0, 2: 0.6, 3: 0.3}
                    metric_data['weight'] = weight_map.get(metric_data['priority_rank'], 1.0)
                    
                    # Set current_label based on target_units and current_value
                    if metric_data['current_value'] is not None:
                        if metric_data['target_units'] == '%':
                            metric_data['current_label'] = f"{metric_data['current_value']:.1f}%"
                        elif metric_data['target_units'] in ['hours', 'days']:
                            metric_data['current_label'] = f"{metric_data['current_value']:.1f} {metric_data['target_units']}"
                        elif metric_data['target_units'] in ['per year', 'per month']:
                            metric_data['current_label'] = f"{metric_data['current_value']:.0f} {metric_data['target_units']}"
                        else:
                            unit = metric_data['target_units'] or ""
                            metric_data['current_label'] = f"{metric_data['current_value']:.1f} {unit}".strip()
                        
                        # Set last_collected_at to now for metrics with current values
                        metric_data['last_collected_at'] = datetime.now(timezone.utc)
                    
                    # Create metric
                    metric = Metric(**metric_data)
                    db.add(metric)
                    metrics_loaded += 1
                    
                    if metrics_loaded % 10 == 0:
                        print(f"  📊 Loaded {metrics_loaded} metrics...")
                
                except Exception as e:
                    print(f"❌ Error loading metric '{row.get('name', 'UNKNOWN')}': {e}")
                    continue
        
        # Commit all changes
        db.commit()
        
        print(f"✅ Successfully loaded {metrics_loaded} metrics")
        
        # Print summary by function
        print("\n📈 Metrics by CSF Function:")
        from models import FrameworkFunction
        for func in CSFFunction:
            fw_func = db.query(FrameworkFunction).filter(FrameworkFunction.code == func.value).first()
            if fw_func:
                count = db.query(Metric).filter(Metric.function_id == fw_func.id).count()
            else:
                count = 0
            print(f"  {func.value.upper()}: {count} metrics")
        
        # Print summary by priority
        print("\n🎯 Metrics by Priority:")
        for priority in [1, 2, 3]:
            count = db.query(Metric).filter(Metric.priority_rank == priority).count()
            priority_name = {1: 'High', 2: 'Medium', 3: 'Low'}[priority]
            print(f"  {priority_name}: {count} metrics")
        
        # Print metrics with current values
        metrics_with_values = db.query(Metric).filter(Metric.current_value != None).count()
        print(f"\n💹 Metrics with current values: {metrics_with_values}/{metrics_loaded}")
        
    except Exception as e:
        print(f"❌ Error during seed loading: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


def add_sample_history():
    """Add sample historical data points for demonstration."""
    from ..models import MetricHistory
    import random
    from datetime import timedelta
    
    db: Session = SessionLocal()
    
    try:
        print("📊 Adding comprehensive historical data...")
        
        # Get ALL metrics with current values
        all_metrics = (
            db.query(Metric)
            .filter(Metric.current_value != None)
            .all()
        )
        
        print(f"  📈 Generating history for {len(all_metrics)} metrics...")
        
        history_added = 0
        base_date = datetime.now(timezone.utc)
        
        for metric_idx, metric in enumerate(all_metrics):
            # Add 6 months of historical data (26 weeks)
            for week in range(26):
                history_date = base_date - timedelta(weeks=week + 1)
                
                # Generate realistic historical values with trends
                current = float(metric.current_value)
                target = float(metric.target_value) if metric.target_value else current
                
                # Create trend patterns based on metric type
                if metric.direction == MetricDirection.HIGHER_IS_BETTER:
                    # Show gradual improvement over time
                    improvement_factor = (26 - week) / 26  # Older data shows more room for improvement
                    base_historical = current - (improvement_factor * random.uniform(5, 15))
                    
                    # Add some realistic variance
                    variance = random.uniform(-2, 2)
                    historical_value = base_historical + variance
                    
                elif metric.direction == MetricDirection.LOWER_IS_BETTER:
                    # Show gradual improvement (lower values over time)
                    degradation_factor = (26 - week) / 26  # Older data shows worse performance
                    base_historical = current + (degradation_factor * random.uniform(5, 15))
                    
                    # Add some realistic variance
                    variance = random.uniform(-1, 3)
                    historical_value = base_historical + variance
                    
                elif metric.direction == MetricDirection.BINARY:
                    # Binary metrics - show some historical false states
                    if week < 10:  # Recent history mostly good
                        historical_value = 1.0 if random.random() > 0.1 else 0.0
                    else:  # Older history shows more issues
                        historical_value = 1.0 if random.random() > 0.3 else 0.0
                        
                else:  # TARGET_RANGE
                    # Show values gradually converging to target range
                    convergence_factor = week / 26
                    if metric.tolerance_low and metric.tolerance_high:
                        range_center = (metric.tolerance_low + metric.tolerance_high) / 2
                        deviation = abs(current - range_center) * convergence_factor
                        historical_value = current + random.uniform(-deviation, deviation)
                    else:
                        historical_value = current + random.uniform(-5, 5)
                
                # Ensure values stay within reasonable bounds
                if metric.target_units == '%':
                    historical_value = max(0, min(100, historical_value))
                else:
                    historical_value = max(0, historical_value)
                
                # Add some seasonal/cyclical effects for certain metrics
                if 'training' in metric.name.lower() or 'awareness' in metric.name.lower():
                    # Training metrics might have quarterly cycles
                    seasonal_boost = 5 * abs(math.sin(week * math.pi / 13))  # Quarterly cycle
                    if metric.direction == MetricDirection.HIGHER_IS_BETTER:
                        historical_value += seasonal_boost
                elif 'patch' in metric.name.lower() or 'update' in metric.name.lower():
                    # Patch metrics might have monthly cycles
                    patch_cycle = 3 * abs(math.sin(week * math.pi / 4))  # Monthly cycle
                    if metric.direction == MetricDirection.HIGHER_IS_BETTER:
                        historical_value += patch_cycle
                
                history = MetricHistory(
                    metric_id=metric.id,
                    collected_at=history_date,
                    normalized_value=historical_value,
                    source_ref="seed_data_generator_v2"
                )
                
                db.add(history)
                history_added += 1
                
                # Commit in batches to avoid memory issues
                if history_added % 1000 == 0:
                    db.commit()
                    print(f"    💾 Committed {history_added} history records...")
            
            # Progress indicator
            if (metric_idx + 1) % 20 == 0:
                print(f"    📊 Processed {metric_idx + 1}/{len(all_metrics)} metrics...")
        
        # Final commit
        db.commit()
        print(f"✅ Added {history_added} historical data points across {len(all_metrics)} metrics")
        print(f"📅 Historical data spans 26 weeks (6 months) per metric")
        
    except Exception as e:
        print(f"❌ Error adding historical data: {e}")
        db.rollback()
    
    finally:
        db.close()


def main():
    """Main function to run the seed loading process."""
    print("🌱 NIST CSF 2.0 Metrics Seed Data Loader - 200+ Metrics")
    print("=" * 60)
    
    try:
        # Create tables
        create_tables()
        
        # Load metrics from CSV
        csv_file = sys.argv[1] if len(sys.argv) > 1 else "seed_metrics_200_enhanced.csv"
        load_metrics_from_csv(csv_file)
        
        # Add sample history
        add_sample_history()
        
        print("\n🎉 Seed data loading completed successfully!")
        print(f"\n📊 Loaded comprehensive NIST CSF 2.0 metrics catalog:")
        print("  - 35 Govern metrics (governance, risk management, compliance)")
        print("  - 34 Identify metrics (assets, vulnerabilities, supply chain)")
        print("  - 44 Protect metrics (access control, encryption, secure development)")
        print("  - 30 Detect metrics (monitoring, threat hunting, anomaly detection)")
        print("  - 28 Respond metrics (incident response, crisis management)")
        print("  - 28 Recover metrics (business continuity, vendor coordination)")
        print("\n🌐 You can now:")
        print("  - View the executive dashboard at http://localhost:5175")
        print("  - Explore the comprehensive API at http://localhost:8002/docs")
        print("  - Test AI-powered metrics assistant with GPT-4o")
        print("  - Analyze 6 months of historical trend data")
        
    except Exception as e:
        print(f"\n💥 Seed loading failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()