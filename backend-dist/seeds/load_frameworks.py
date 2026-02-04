"""Framework data loader script.

Loads NIST CSF 2.0 (with Cyber AI Profile) and AI RMF 1.0 framework data
from JSON files into the database.
"""

import json
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from ..db import SessionLocal, engine
from ..models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    FrameworkSubcategory,
    Base,
)


DATA_DIR = Path(__file__).parent.parent / "data"


def load_csf_2_0_with_ai_profile(db: Session) -> Framework:
    """Load NIST CSF 2.0 with integrated Cyber AI Profile data."""
    json_path = DATA_DIR / "nist_csf_2_0_with_ai_profile.json"

    with open(json_path, "r") as f:
        data = json.load(f)

    # Create framework
    framework_data = data["framework"]
    framework = Framework(
        id=uuid.uuid4(),
        code=framework_data["code"],
        name=framework_data["name"],
        version=framework_data["version"],
        description=framework_data["description"],
        source_url=framework_data["source_url"],
        active=framework_data["active"],
        is_extension=framework_data["is_extension"],
    )
    db.add(framework)
    db.flush()  # Get the framework ID

    # Create functions, categories, and subcategories
    for func_data in data["functions"]:
        function = FrameworkFunction(
            id=uuid.uuid4(),
            framework_id=framework.id,
            code=func_data["code"],
            name=func_data["name"],
            description=func_data["description"],
            display_order=func_data["display_order"],
            color_hex=func_data.get("color_hex"),
            icon_name=func_data.get("icon_name"),
        )
        db.add(function)
        db.flush()

        for cat_data in func_data["categories"]:
            category = FrameworkCategory(
                id=uuid.uuid4(),
                function_id=function.id,
                code=cat_data["code"],
                name=cat_data["name"],
                description=cat_data.get("description"),
                display_order=cat_data["display_order"],
            )
            db.add(category)
            db.flush()

            for subcat_data in cat_data["subcategories"]:
                # Check if this subcategory has AI Profile extensions
                ai_profile_focus = None
                ai_extensions = data.get("cyber_ai_profile", {}).get("ai_specific_outcomes", [])
                for ext in ai_extensions:
                    if ext.get("csf_subcategory") == subcat_data["code"]:
                        ai_profile_focus = ext.get("ai_profile_focus")
                        break

                subcategory = FrameworkSubcategory(
                    id=uuid.uuid4(),
                    category_id=category.id,
                    code=subcat_data["code"],
                    outcome=subcat_data["outcome"],
                    display_order=subcat_data["display_order"],
                    ai_profile_focus=ai_profile_focus,
                )
                db.add(subcategory)

    print(f"Loaded framework: {framework.name} ({framework.code})")
    return framework


def load_ai_rmf(db: Session) -> Framework:
    """Load NIST AI RMF 1.0 framework data."""
    json_path = DATA_DIR / "nist_ai_rmf_reference.json"

    with open(json_path, "r") as f:
        data = json.load(f)

    # Create framework
    framework_data = data["framework"]
    framework = Framework(
        id=uuid.uuid4(),
        code=framework_data["code"],
        name=framework_data["name"],
        version=framework_data["version"],
        description=framework_data["description"],
        source_url=framework_data["source_url"],
        active=framework_data["active"],
        is_extension=framework_data["is_extension"],
    )
    db.add(framework)
    db.flush()

    # Create functions, categories, and subcategories
    for func_data in data["functions"]:
        function = FrameworkFunction(
            id=uuid.uuid4(),
            framework_id=framework.id,
            code=func_data["code"],
            name=func_data["name"],
            description=func_data["description"],
            display_order=func_data["display_order"],
            color_hex=func_data.get("color_hex"),
            icon_name=func_data.get("icon_name"),
        )
        db.add(function)
        db.flush()

        for cat_data in func_data["categories"]:
            category = FrameworkCategory(
                id=uuid.uuid4(),
                function_id=function.id,
                code=cat_data["code"],
                name=cat_data["name"],
                description=cat_data.get("description"),
                display_order=cat_data["display_order"],
            )
            db.add(category)
            db.flush()

            for subcat_data in cat_data["subcategories"]:
                subcategory = FrameworkSubcategory(
                    id=uuid.uuid4(),
                    category_id=category.id,
                    code=subcat_data["code"],
                    outcome=subcat_data["outcome"],
                    display_order=subcat_data["display_order"],
                    trustworthiness_characteristic=subcat_data.get("trustworthiness_characteristic"),
                )
                db.add(subcategory)

    print(f"Loaded framework: {framework.name} ({framework.code})")
    return framework


def get_framework_stats(db: Session, framework: Framework) -> Dict[str, int]:
    """Get statistics about a loaded framework."""
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

    return {
        "functions": functions_count,
        "categories": categories_count,
        "subcategories": subcategories_count,
    }


def load_all_frameworks(db: Optional[Session] = None) -> Dict[str, Framework]:
    """Load all framework data into the database.

    Args:
        db: Optional database session. If not provided, creates a new one.

    Returns:
        Dictionary mapping framework codes to Framework objects.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        frameworks = {}

        # Check if frameworks already exist
        existing_csf = db.query(Framework).filter(Framework.code == "csf_2_0").first()
        existing_ai_rmf = db.query(Framework).filter(Framework.code == "ai_rmf").first()

        if existing_csf:
            print(f"Framework {existing_csf.code} already exists, skipping...")
            frameworks["csf_2_0"] = existing_csf
        else:
            csf_framework = load_csf_2_0_with_ai_profile(db)
            frameworks["csf_2_0"] = csf_framework
            stats = get_framework_stats(db, csf_framework)
            print(f"  - {stats['functions']} functions, {stats['categories']} categories, {stats['subcategories']} subcategories")

        if existing_ai_rmf:
            print(f"Framework {existing_ai_rmf.code} already exists, skipping...")
            frameworks["ai_rmf"] = existing_ai_rmf
        else:
            ai_rmf_framework = load_ai_rmf(db)
            frameworks["ai_rmf"] = ai_rmf_framework
            stats = get_framework_stats(db, ai_rmf_framework)
            print(f"  - {stats['functions']} functions, {stats['categories']} categories, {stats['subcategories']} subcategories")

        db.commit()
        print("\nFramework data loaded successfully!")
        return frameworks

    except Exception as e:
        db.rollback()
        print(f"Error loading framework data: {e}")
        raise
    finally:
        if should_close:
            db.close()


def clear_all_frameworks(db: Optional[Session] = None) -> None:
    """Clear all framework data from the database.

    Use with caution - this will delete all frameworks, functions, categories,
    subcategories, and related data.

    Args:
        db: Optional database session. If not provided, creates a new one.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Delete in reverse order of dependencies
        deleted_subcats = db.query(FrameworkSubcategory).delete()
        deleted_cats = db.query(FrameworkCategory).delete()
        deleted_funcs = db.query(FrameworkFunction).delete()
        deleted_frameworks = db.query(Framework).delete()

        db.commit()
        print(f"Cleared: {deleted_frameworks} frameworks, {deleted_funcs} functions, "
              f"{deleted_cats} categories, {deleted_subcats} subcategories")
    except Exception as e:
        db.rollback()
        print(f"Error clearing framework data: {e}")
        raise
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Load framework data into the database")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all existing framework data before loading",
    )
    parser.add_argument(
        "--clear-only",
        action="store_true",
        help="Only clear framework data, do not load new data",
    )
    args = parser.parse_args()

    if args.clear_only:
        clear_all_frameworks()
    else:
        if args.clear:
            clear_all_frameworks()
        load_all_frameworks()
