"""Idempotent development seed: two demo accounts.

    analyst@example.com  / Password123!   (role: analyst)
    admin@example.com    / Password123!   (role: admin)

Run:  cd backend && python -m app.db.seed
"""
from __future__ import annotations

import logging

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.models import User
from app.db.session import SessionLocal, engine

logger = logging.getLogger("app.db.seed")

DEMO_ANALYST = ("analyst@example.com", "Demo Analyst", "analyst", "Password123!")
DEMO_ADMIN = ("admin@example.com", "Demo Admin", "admin", "Password123!")


def seed_users(db) -> list[User]:
    created: list[User] = []
    for email, full_name, role, password in (DEMO_ANALYST, DEMO_ADMIN):
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing:
            logger.info("User already present: %s", email)
            continue
        user = User(
            email=email,
            full_name=full_name,
            role=role,
            hashed_password=hash_password(password),
            is_active=True,
        )
        db.add(user)
        created.append(user)
    db.commit()
    for u in created:
        logger.info("Created user %s (%s)", u.email, u.role)
    return created


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    if not engine.dialect.name.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_users(db)
    logger.info("Seed complete. Login: analyst@example.com / admin@example.com (Password123!)")


if __name__ == "__main__":
    main()
