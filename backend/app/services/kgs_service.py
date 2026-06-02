"""Key Generation Service — pre-computes Base62 6-char keys into a Postgres pool."""
import asyncio
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.security import generate_key
from backend.app.core.logging import logger


class KGSService:
    POOL_THRESHOLD = 20
    BATCH_SIZE = 50

    def __init__(self, db: AsyncSession):
        self.db = db

    async def reserve_key(self) -> str:
        from backend.app.models.kgs_key import KgsKey
        stmt = (
            select(KgsKey)
            .where(KgsKey.used == False)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()

        if row is None:
            await self._refill_pool()
            result = await self.db.execute(stmt)
            row = result.scalar_one_or_none()
            if row is None:
                return generate_key()

        await self.db.execute(
            update(KgsKey).where(KgsKey.key == row.key).values(used=True)
        )
        await self.db.commit()

        remaining = await self._pool_size()
        if remaining < self.POOL_THRESHOLD:
            asyncio.create_task(self._background_refill())

        return row.key

    async def _pool_size(self) -> int:
        from backend.app.models.kgs_key import KgsKey
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.count()).where(KgsKey.used == False)
        )
        return result.scalar_one()

    async def _refill_pool(self) -> None:
        from backend.app.models.kgs_key import KgsKey
        keys = [KgsKey(key=generate_key()) for _ in range(self.BATCH_SIZE)]
        self.db.add_all(keys)
        await self.db.commit()
        logger.info("kgs.pool.refilled", count=self.BATCH_SIZE)

    async def _background_refill(self) -> None:
        try:
            await self._refill_pool()
        except Exception as e:
            logger.warning("kgs.refill.failed", error=str(e))
