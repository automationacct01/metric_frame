"""Master seed script for loading all framework and metrics data.

This script orchestrates the loading of:
1. Framework hierarchies (CSF 2.0 with Cyber AI Profile, AI RMF)
2. Sample metrics for each framework

Usage:
    python -m src.seeds.seed_all           # Load all data
    python -m src.seeds.seed_all --clear   # Clear and reload all data
    python -m src.seeds.seed_all --summary # Show summary of loaded data
"""

import argparse
from typing import Dict, Any

from ..db import SessionLocal, engine
from ..models import Base
from .load_frameworks import load_all_frameworks, clear_all_frameworks, get_framework_stats
from .load_metrics import load_all_metrics, clear_all_metrics, get_metrics_summary
from .load_ai_providers import load_ai_providers, clear_ai_providers, get_ai_provider_summary


def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")


def seed_all(clear: bool = False):
    """Load all seed data.

    Args:
        clear: If True, clears existing data before loading
    """
    db = SessionLocal()

    try:
        if clear:
            print("\n" + "=" * 60)
            print("Clearing existing data...")
            print("=" * 60)
            clear_all_metrics(db)
            clear_all_frameworks(db)
            clear_ai_providers(db)
            db.commit()

        print("\n" + "=" * 60)
        print("Loading framework data...")
        print("=" * 60)
        frameworks = load_all_frameworks(db)

        print("\n" + "=" * 60)
        print("Loading metrics data...")
        print("=" * 60)
        metrics = load_all_metrics(db)

        print("\n" + "=" * 60)
        print("Loading AI provider data...")
        print("=" * 60)
        ai_providers = load_ai_providers(db)

        db.commit()

        print("\n" + "=" * 60)
        print("SEED COMPLETE!")
        print("=" * 60)
        print_summary(db)

    except Exception as e:
        db.rollback()
        print(f"\nError during seeding: {e}")
        raise
    finally:
        db.close()


def print_summary(db=None):
    """Print a summary of the loaded data."""
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        from ..models import Framework, FrameworkFunction, FrameworkCategory, FrameworkSubcategory, Metric, AIProvider, AIModel

        frameworks = db.query(Framework).all()

        print("\n" + "-" * 40)
        print("DATA SUMMARY")
        print("-" * 40)

        for framework in frameworks:
            functions_count = db.query(FrameworkFunction).filter(
                FrameworkFunction.framework_id == framework.id
            ).count()

            categories_count = db.query(FrameworkCategory).join(FrameworkFunction).filter(
                FrameworkFunction.framework_id == framework.id
            ).count()

            subcategories_count = db.query(FrameworkSubcategory).join(FrameworkCategory).join(
                FrameworkFunction
            ).filter(
                FrameworkFunction.framework_id == framework.id
            ).count()

            metrics_count = db.query(Metric).filter(
                Metric.framework_id == framework.id
            ).count()

            print(f"\n{framework.name} ({framework.code}):")
            print(f"  Functions:     {functions_count}")
            print(f"  Categories:    {categories_count}")
            print(f"  Subcategories: {subcategories_count}")
            print(f"  Metrics:       {metrics_count}")

        total_metrics = db.query(Metric).count()
        print(f"\n{'=' * 40}")
        print(f"Total Metrics: {total_metrics}")
        print("=" * 40)

        # AI Provider summary
        ai_providers = db.query(AIProvider).all()
        total_models = db.query(AIModel).count()
        print(f"\nAI Providers: {len(ai_providers)}")
        print(f"AI Models: {total_models}")
        for provider in ai_providers:
            model_count = db.query(AIModel).filter(AIModel.provider_id == provider.id).count()
            print(f"  {provider.name}: {model_count} models")

    finally:
        if should_close:
            db.close()


def run_full_seed(clear_existing: bool = False):
    """Run the full seeding process.

    This function is designed to be called programmatically from main.py
    for auto-initialization on desktop app first launch.

    Args:
        clear_existing: If True, clears existing data before loading
    """
    create_tables()
    seed_all(clear=clear_existing)


def main():
    parser = argparse.ArgumentParser(
        description="Load all framework and metrics seed data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m src.seeds.seed_all           # Load all data
  python -m src.seeds.seed_all --clear   # Clear and reload all data
  python -m src.seeds.seed_all --summary # Show summary of loaded data
  python -m src.seeds.seed_all --create-tables # Create database tables only
        """
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all existing data before loading",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print summary of data in database",
    )
    parser.add_argument(
        "--create-tables",
        action="store_true",
        help="Create database tables only (no data loading)",
    )
    args = parser.parse_args()

    if args.create_tables:
        create_tables()
    elif args.summary:
        print_summary()
    else:
        create_tables()  # Ensure tables exist
        seed_all(clear=args.clear)


if __name__ == "__main__":
    main()
