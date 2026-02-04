"""Script to add AI categories to existing CSF 2.0 framework."""

import json
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import (
    Framework,
    FrameworkFunction,
    FrameworkCategory,
    FrameworkSubcategory,
)

DATA_DIR = Path(__file__).parent.parent / "data"


def add_ai_categories_to_csf(db: Session) -> None:
    """Add AI categories from JSON to existing CSF 2.0 framework."""
    json_path = DATA_DIR / "nist_csf_2_0_with_ai_profile.json"

    with open(json_path, "r") as f:
        data = json.load(f)

    # Get existing CSF 2.0 framework
    framework = db.query(Framework).filter(Framework.code == "csf_2_0").first()
    if not framework:
        print("CSF 2.0 framework not found!")
        return

    print(f"Found framework: {framework.name} (ID: {framework.id})")

    # Process each function
    for func_data in data["functions"]:
        func_code = func_data["code"]

        # Find existing function
        function = db.query(FrameworkFunction).filter(
            FrameworkFunction.framework_id == framework.id,
            FrameworkFunction.code == func_code
        ).first()

        if not function:
            print(f"Function {func_code} not found, skipping...")
            continue

        print(f"\nProcessing function: {function.name} ({function.code})")

        # Process categories - only add AI categories
        for cat_data in func_data["categories"]:
            cat_code = cat_data["code"]

            # Only process AI categories (contain .AI-)
            if ".AI-" not in cat_code:
                continue

            # Check if category already exists
            existing_cat = db.query(FrameworkCategory).filter(
                FrameworkCategory.function_id == function.id,
                FrameworkCategory.code == cat_code
            ).first()

            if existing_cat:
                print(f"  Category {cat_code} already exists, skipping...")
                continue

            # Create new AI category
            category = FrameworkCategory(
                id=uuid.uuid4(),
                function_id=function.id,
                code=cat_code,
                name=cat_data["name"],
                description=cat_data.get("description"),
                display_order=cat_data["display_order"],
            )
            db.add(category)
            db.flush()
            print(f"  Added category: {cat_code} - {cat_data['name']}")

            # Add subcategories
            for subcat_data in cat_data["subcategories"]:
                subcategory = FrameworkSubcategory(
                    id=uuid.uuid4(),
                    category_id=category.id,
                    code=subcat_data["code"],
                    outcome=subcat_data["outcome"],
                    display_order=subcat_data["display_order"],
                )
                db.add(subcategory)
                print(f"    Added subcategory: {subcat_data['code']}")

    db.commit()
    print("\nAI categories added successfully!")


def main():
    db = SessionLocal()
    try:
        add_ai_categories_to_csf(db)
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
