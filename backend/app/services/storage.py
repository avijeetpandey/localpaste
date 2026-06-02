"""Async MinIO object-storage wrapper."""
from __future__ import annotations

import io
from typing import Optional

import aiohttp
from miniopy_async import Minio
from miniopy_async.error import S3Error

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    def __init__(self) -> None:
        self._client: Optional[Minio] = None
        self._bucket = settings.minio_bucket

    @property
    def client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
                region=settings.minio_region,
            )
        return self._client

    async def ensure_bucket(self) -> None:
        try:
            exists = await self.client.bucket_exists(self._bucket)
            if not exists:
                await self.client.make_bucket(self._bucket)
                logger.info("minio.bucket.created", bucket=self._bucket)
        except S3Error as exc:
            logger.error("minio.bucket.error", error=str(exc))
            raise

    async def put_text(self, key: str, content: str, content_type: str = "text/plain; charset=utf-8") -> int:
        data = content.encode("utf-8")
        stream = io.BytesIO(data)
        await self.client.put_object(
            self._bucket,
            key,
            stream,
            length=len(data),
            content_type=content_type,
        )
        return len(data)

    async def get_text(self, key: str) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                response = await self.client.get_object(self._bucket, key, session)
                try:
                    body = await response.read()
                finally:
                    response.close()
                    await response.release()
            return body.decode("utf-8")
        except S3Error as exc:
            if exc.code in {"NoSuchKey", "NoSuchObject"}:
                raise FileNotFoundError(f"object not found: {key}") from exc
            raise

    async def delete(self, key: str) -> None:
        try:
            await self.client.remove_object(self._bucket, key)
        except S3Error as exc:
            logger.warning("minio.delete.failed", key=key, error=str(exc))


storage_service = StorageService()
