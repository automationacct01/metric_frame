"""Seed default users for the application."""

from sqlalchemy.orm import Session
from ..models import User


def clear_users(db: Session) -> int:
    """Delete all users from the database."""
    count = db.query(User).delete()
    db.commit()
    return count


def load_users(db: Session) -> int:
    """
    Load default users into the database.

    Creates users with different roles for testing and initial setup:
    - admin@example.com: Full admin access
    - analyst@example.com: Editor role for security analysts
    - viewer@example.com: Read-only access

    Returns the number of users created.
    """
    default_users = [
        User(
            name='Admin User',
            email='admin@example.com',
            role='admin',
            active=True
        ),
        User(
            name='Security Analyst',
            email='analyst@example.com',
            role='editor',
            active=True
        ),
        User(
            name='Viewer',
            email='viewer@example.com',
            role='viewer',
            active=True
        ),
    ]

    created_count = 0
    for user in default_users:
        existing = db.query(User).filter(User.email == user.email).first()
        if not existing:
            db.add(user)
            created_count += 1

    db.commit()
    return created_count
