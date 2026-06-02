"""Paste service."""
from __future__ import annotations

import asyncio
import ipaddress
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_text, encrypt_text
from app.core.logging import get_logger
from app.models.paste import Paste, PasteVisibility
from app.schemas.paste import ExpirationOption, PasteCreate, PasteUpdate
from app.services.kgs import kgs_service
from app.services.redis_service import redis_service
from app.services.storage import storage_service

logger = get_logger(__name__)
CACHE_PREFIX = "paste:meta:"
CACHE_BODY_PREFIX = "paste:body:"
CACHE_TTL_SECONDS = 300


class PasteServiceError(Exception):
    pass


def _expiration_to_datetime(opt: ExpirationOption) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    mapping = {
        ExpirationOption.NEVER: None,
        ExpirationOption.TEN_MINUTES: timedelta(minutes=10),
        ExpirationOption.ONE_HOUR: timedelta(hours=1),
        ExpirationOption.ONE_DAY: timedelta(days=1),
        ExpirationOption.ONE_WEEK: timedelta(days=7),
        ExpirationOption.ONE_MONTH: timedelta(days=30),
    }
    delta = mapping.get(opt)
    return now + delta if delta else None


def _check_ip_allowed(paste: Paste, client_ip: str) -> bool:
    if not paste.allowed_ips:
        return True
    try:
        allowed = json.loads(paste.allowed_ips)
        client = ipaddress.ip_address(client_ip)
        for cidr in allowed:
            try:
                if client in ipaddress.ip_network(cidr, strict=False):
                    return True
            except ValueError:
                if cidr == client_ip:
                    return True
        return False
    except Exception:
        return True


class PasteService:
    async def create(self, session: AsyncSession, payload: PasteCreate, owner_id: Optional[uuid.UUID]) -> Paste:
        key = await kgs_service.reserve_key(session)
        body = payload.content
        nonce: Optional[str] = None
        if payload.encrypt:
            enc = encrypt_text(body)
            body = enc.ciphertext_b64
            nonce = enc.nonce_b64
        storage_key = f"pastes/{key}.txt"
        try:
            size = await storage_service.put_text(storage_key, body)
        except Exception as exc:
            await kgs_service.free_key(session, key)
            await session.commit()
            logger.error("paste.create.storage_failed", error=str(exc))
            raise PasteServiceError("Failed to persist paste body to storage") from exc
        paste = Paste(
            id=key,
            title=payload.title or "Untitled",
            language=payload.language or "plaintext",
            storage_key=storage_key,
            size_bytes=size,
            visibility=payload.visibility,
            burn_after_read=payload.burn_after_read,
            is_encrypted=payload.encrypt,
            encryption_nonce=nonce,
            zk_encrypted=payload.zk_encrypted,
            zk_iv=payload.zk_iv,
            allowed_ips=json.dumps(payload.allowed_ips) if payload.allowed_ips else None,
            parent_id=payload.parent_id,
            workspace_id=payload.workspace_id,
            expires_at=_expiration_to_datetime(payload.expiration),
            owner_id=owner_id,
        )
        session.add(paste)
        await session.commit()
        await session.refresh(paste)
        return paste

    async def get_metadata(self, session: AsyncSession, paste_id: str) -> Optional[Paste]:
        result = await session.execute(select(Paste).where(Paste.id == paste_id))
        paste = result.scalar_one_or_none()
        if paste is None:
            return None
        if paste.expires_at and paste.expires_at <= datetime.now(timezone.utc):
            await self.delete(session, paste, owner_id=None, force=True)
            return None
        return paste

    async def get_with_body(self, session: AsyncSession, paste_id: str) -> Optional[tuple[Paste, str]]:
        paste = await self.get_metadata(session, paste_id)
        if paste is None:
            return None
        body_cache_key = CACHE_BODY_PREFIX + paste_id
        body_cached = await redis_service.cache_get(body_cache_key)
        if body_cached is not None:
            stored = body_cached
        else:
            try:
                stored = await storage_service.get_text(paste.storage_key)
            except FileNotFoundError:
                return None
            await redis_service.cache_set(body_cache_key, stored, ttl_seconds=CACHE_TTL_SECONDS)
        content = stored
        if paste.is_encrypted and paste.encryption_nonce:
            try:
                content = decrypt_text(stored, paste.encryption_nonce)
            except Exception as exc:
                raise PasteServiceError("Failed to decrypt paste body") from exc
        paste.view_count += 1
        await session.flush()
        if paste.burn_after_read:
            await self.delete(session, paste, owner_id=None, force=True)
        else:
            await session.commit()
        return paste, content

    async def list_for_user(self, session: AsyncSession, owner_id: uuid.UUID, limit: int = 100, offset: int = 0) -> list[Paste]:
        result = await session.execute(
            select(Paste).where(Paste.owner_id == owner_id).order_by(desc(Paste.created_at)).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def list_public(self, session: AsyncSession, limit: int = 50, offset: int = 0) -> list[Paste]:
        result = await session.execute(
            select(Paste).where(Paste.visibility == PasteVisibility.PUBLIC).order_by(desc(Paste.created_at)).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def update(self, session: AsyncSession, paste: Paste, payload: PasteUpdate) -> Paste:
        if payload.title is not None:
            paste.title = payload.title
        if payload.language is not None:
            paste.language = payload.language
        if payload.visibility is not None:
            paste.visibility = payload.visibility
        await session.flush()
        await session.commit()
        await redis_service.cache_delete(CACHE_PREFIX + paste.id, CACHE_BODY_PREFIX + paste.id)
        return paste

    async def delete(self, session: AsyncSession, paste: Paste, owner_id: Optional[uuid.UUID], force: bool = False) -> None:
        if not force and paste.owner_id != owner_id:
            raise PasteServiceError("Not authorised to delete this paste")
        await storage_service.delete(paste.storage_key)
        await session.delete(paste)
        await session.commit()
        await redis_service.cache_delete(CACHE_PREFIX + paste.id, CACHE_BODY_PREFIX + paste.id)

    async def fork(self, session: AsyncSession, paste: Paste, owner_id: Optional[uuid.UUID]) -> Paste:
        """Create a fork of an existing paste."""
        try:
            original_body = await storage_service.get_text(paste.storage_key)
        except FileNotFoundError:
            raise PasteServiceError("Original paste body not found in storage")

        key = await kgs_service.reserve_key(session)
        storage_key = f"pastes/{key}.txt"
        try:
            size = await storage_service.put_text(storage_key, original_body)
        except Exception as exc:
            await kgs_service.free_key(session, key)
            await session.commit()
            raise PasteServiceError("Failed to persist forked paste body") from exc

        forked = Paste(
            id=key,
            title=f"{paste.title} (fork)",
            language=paste.language,
            storage_key=storage_key,
            size_bytes=size,
            visibility=paste.visibility,
            burn_after_read=False,
            is_encrypted=paste.is_encrypted,
            encryption_nonce=paste.encryption_nonce,
            zk_encrypted=paste.zk_encrypted,
            zk_iv=paste.zk_iv,
            allowed_ips=paste.allowed_ips,
            parent_id=paste.id,
            version=paste.version + 1,
            expires_at=None,
            owner_id=owner_id,
        )
        session.add(forked)
        paste.fork_count = (paste.fork_count or 0) + 1
        await session.commit()
        await session.refresh(forked)
        return forked

    async def get_version_chain(self, session: AsyncSession, paste_id: str) -> list[Paste]:
        """Return all pastes in the version chain (ancestors + descendants)."""
        root_id = paste_id
        current = await self.get_metadata(session, paste_id)
        if current is None:
            return []
        # Walk up to find root
        while current and current.parent_id:
            parent = await self.get_metadata(session, current.parent_id)
            if parent is None:
                break
            root_id = parent.id
            current = parent

        # Walk down from root collecting all versions
        visited: list[Paste] = []
        queue = [root_id]
        while queue:
            cid = queue.pop(0)
            node = await self.get_metadata(session, cid)
            if node is None:
                continue
            visited.append(node)
            result = await session.execute(select(Paste).where(Paste.parent_id == cid))
            children = list(result.scalars().all())
            for child in children:
                queue.append(child.id)

        return sorted(visited, key=lambda p: p.version)


paste_service = PasteService()
