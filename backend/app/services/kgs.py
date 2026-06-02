"""Key Generation Service (KGS).

Pre-generates a pool of unique Base62 keys stored in Postgres so that paste
creation never has to retry on collision. A background loop keeps the pool
topped up to ``KGS_POOL_TARGET``.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base62 import random_key
from app.core.config import settings
from app.core.logging import get_logger
from app.db.base import AsyncSessionLocal
from app.models.kgs_key import KgsKey

logger = get_logger(__name__)


class KgsService:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._stop = asyncio.Event()
        self._lock = asyncio.Lock()

    # --- public API -----------------------------------------------------
    async def reserve_key(self, session: AsyncSession) -> str:
        """Reserve and mark a key as used. Generates one inline if pool is empty."""
        for _ in range(3):
            stmt = (
                select(KgsKey)
                .where(KgsKey.used.is_(False))
                .order_by(KgsKey.id.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row is not None:
                row.used = True
                row.used_at = datetime.now(timezone.utc)
                await session.flush()
                return row.key
            # Pool empty - generate a fresh one inline.
            generated = await self._insert_random_keys(session, count=10)
            if generated == 0:
                continue
        # Last resort: emit a random key (extremely unlikely to collide for 6 chars).
        return random_key(settings.kgs_key_length)

    async def free_key(self, session: AsyncSession, key: str) -> None:
        """Mark a key as unused again (e.g., on rollback)."""
        await session.execute(
            update(KgsKey).where(KgsKey.key == key).values(used=False, used_at=None)
        )

    async def pool_count(self, session: AsyncSession) -> int:
        result = await session.execute(
            select(func.count()).select_from(KgsKey).where(KgsKey.used.is_(False))
        )
        return int(result.scalar_one())

    # --- background loop -----------------------------------------------
    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._run(), name="kgs-refill")
        logger.info("kgs.started")

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5)
            except asyncio.TimeoutError:
                self._task.cancel()
        logger.info("kgs.stopped")

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                await self._refill_if_needed()
            except Exception as exc:  # pragma: no cover - logged & retried
                logger.error("kgs.refill.error", error=str(exc))
            try:
                await asyncio.wait_for(
                    self._stop.wait(), timeout=settings.kgs_refill_interval_seconds
                )
            except asyncio.TimeoutError:
                pass

    async def _refill_if_needed(self) -> None:
        async with self._lock:
            async with AsyncSessionLocal() as session:
                count = await self.pool_count(session)
                if count >= settings.kgs_refill_threshold:
                    return
                deficit = max(settings.kgs_pool_target - count, 0)
                if deficit == 0:
                    return
                inserted = await self._insert_random_keys(session, count=deficit)
                await session.commit()
                logger.info("kgs.refilled", inserted=inserted, pool_now=count + inserted)

    async def _insert_random_keys(self, session: AsyncSession, count: int) -> int:
        """Insert ``count`` random keys, ignoring conflicts. Returns rows inserted."""
        if count <= 0:
            return 0
        # Generate slightly more than needed since some may collide on uniqueness.
        candidates = {random_key(settings.kgs_key_length) for _ in range(count * 2)}
        rows = [{"key": k, "used": False} for k in candidates]
        stmt = pg_insert(KgsKey).values(rows).on_conflict_do_nothing(index_elements=["key"])
        result = await session.execute(stmt)
        await session.flush()
        return result.rowcount or 0


kgs_service = KgsService()
