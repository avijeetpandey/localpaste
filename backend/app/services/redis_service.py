"""Redis client wrapper - used for cache-aside, rate-limiting, and KGS staging."""
from __future__ import annotations

from typing import Optional

import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RedisService:
    def __init__(self) -> None:
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        if self._client is None:
            self._client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                health_check_interval=30,
            )
            await self._client.ping()
            logger.info("redis.connected", url=settings.redis_url)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            raise RuntimeError("Redis client not initialised. Call connect() first.")
        return self._client

    # --- cache helpers -------------------------------------------------
    async def cache_set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        if ttl_seconds:
            await self.client.set(key, value, ex=ttl_seconds)
        else:
            await self.client.set(key, value)

    async def cache_get(self, key: str) -> str | None:
        return await self.client.get(key)

    async def cache_delete(self, *keys: str) -> None:
        if keys:
            await self.client.delete(*keys)


redis_service = RedisService()
