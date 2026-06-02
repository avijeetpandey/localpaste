"""Idempotent seed-data loader run on application startup."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from app.core.logging import get_logger
from app.core.security import hash_password
from app.db.base import AsyncSessionLocal
from app.models.paste import Paste, PasteVisibility
from app.models.user import User
from app.services.kgs import kgs_service
from app.services.storage import storage_service

logger = get_logger(__name__)


SEED_USERS = [
    {
        "email": "demo@localpaste.dev",
        "username": "demo",
        "password": "demo12345",
        "is_admin": False,
    },
    {
        "email": "admin@localpaste.dev",
        "username": "admin",
        "password": "admin12345",
        "is_admin": True,
    },
]

SEED_PASTES = [
    {
        "title": "Welcome to localpaste",
        "language": "markdown",
        "visibility": PasteVisibility.PUBLIC,
        "content": (
            "# Welcome to localpaste\n\n"
            "This is a self-hosted Pastebin alternative.\n\n"
            "- Fast text sharing\n"
            "- Syntax highlighting\n"
            "- Burn-after-reading mode\n"
            "- Configurable expiration\n"
        ),
    },
    {
        "title": "Hello, World in Python",
        "language": "python",
        "visibility": PasteVisibility.PUBLIC,
        "content": "def main() -> None:\n    print(\"Hello, World!\")\n\n\nif __name__ == \"__main__\":\n    main()\n",
    },
    {
        "title": "Quick TypeScript snippet",
        "language": "typescript",
        "visibility": PasteVisibility.PUBLIC,
        "content": "export const greet = (name: string): string => `Hello, ${name}!`;\n\nconsole.log(greet('localpaste'));\n",
    },
]


async def seed_initial_data() -> None:
    """Seed users + a few sample pastes if none exist."""
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).limit(1))
        if existing.scalar_one_or_none() is not None:
            logger.info("seed.skip", reason="users already exist")
            return

        users: dict[str, User] = {}
        for record in SEED_USERS:
            user = User(
                email=record["email"],
                username=record["username"],
                password_hash=hash_password(record["password"]),
                is_admin=record["is_admin"],
            )
            session.add(user)
            users[record["username"]] = user
        await session.flush()

        demo = users["demo"]
        for record in SEED_PASTES:
            try:
                key = await kgs_service.reserve_key(session)
            except Exception:
                # KGS background loop may not have started yet; generate one inline.
                from app.core.base62 import random_key
                from app.core.config import settings

                key = random_key(settings.kgs_key_length)
            storage_key = f"pastes/{key}.txt"
            try:
                size = await storage_service.put_text(storage_key, record["content"])
            except Exception as exc:
                logger.warning("seed.storage_failed", error=str(exc))
                size = len(record["content"].encode("utf-8"))
            paste = Paste(
                id=key,
                title=record["title"],
                language=record["language"],
                storage_key=storage_key,
                size_bytes=size,
                visibility=record["visibility"],
                burn_after_read=False,
                is_encrypted=False,
                owner_id=demo.id,
                created_at=datetime.now(timezone.utc),
            )
            session.add(paste)

        await session.commit()
        logger.info("seed.complete", users=len(users), pastes=len(SEED_PASTES))
