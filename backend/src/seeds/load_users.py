"""Seed default users for the application.

NOTE: For production/local desktop use, users should register themselves.
The first user to register automatically becomes an admin.

This seed file is mainly for development/testing purposes.
"""

import hashlib
import os
from sqlalchemy.orm import Session
from ..models import User


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 (simple approach for local app)."""
    return hashlib.sha256(password.encode()).hexdigest()


def clear_users(db: Session) -> int:
    """Delete all users from the database."""
    count = db.query(User).delete()
    db.commit()
    return count


def load_users(db: Session, create_demo_users: bool = None) -> int:
    """
    Load demo users into the database (for development/testing only).

    By default, no users are created - users should register themselves.
    Set SEED_DEMO_USERS=true environment variable or pass create_demo_users=True
    to create demo users for testing.

    Demo users (when enabled):
    - admin@example.com: Full admin access (password: admin)
    - analyst@example.com: Editor role for analysts (password: analyst)
    - viewer@example.com: Read-only access (password: viewer)

    Returns the number of users created.
    """
    # Check if demo users should be created
    if create_demo_users is None:
        create_demo_users = os.getenv('SEED_DEMO_USERS', 'false').lower() == 'true'

    if not create_demo_users:
        # For production/local use, don't seed users - let them register
        print("  Skipping demo users (users will register themselves)")
        return 0

    print("  Creating demo users for development/testing...")

    demo_users = [
        User(
            name='Admin User',
            email='admin@example.com',
            password_hash=hash_password('admin'),
            role='admin',
            active=True
        ),
        User(
            name='Analyst',
            email='analyst@example.com',
            password_hash=hash_password('analyst'),
            role='editor',
            active=True
        ),
        User(
            name='Viewer',
            email='viewer@example.com',
            password_hash=hash_password('viewer'),
            role='viewer',
            active=True
        ),
    ]

    created_count = 0
    for user in demo_users:
        existing = db.query(User).filter(User.email == user.email).first()
        if not existing:
            db.add(user)
            created_count += 1

    db.commit()
    return created_count
