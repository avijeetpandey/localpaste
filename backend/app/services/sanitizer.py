"""Content sanitizer service - scans paste content for policy violations."""
from __future__ import annotations

import asyncio
import re
from typing import Optional

from app.core.logging import get_logger
from app.db.base import async_session_factory
from app.models.paste import Paste, PasteVisibility

logger = get_logger(__name__)

# Patterns that indicate potentially malicious or prohibited content
_BANNED_PATTERNS = [
    re.compile(r'\b(EICAR-STANDARD-ANTIVIRUS-TEST-FILE)\b'),
    re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
    re.compile(r'(?i)(rm\s+-rf\s+/|format\s+c:|del\s+/[sq]?\s+[\\/])', re.IGNORECASE),
]

_SENSITIVE_PATTERNS = [
    re.compile(r'\b(?:password|passwd|secret|api[_-]?key)\s*[:=]\s*\S+', re.IGNORECASE),
    re.compile(r'(?:eyJ[A-Za-z0-9_-]{10,}\.){2}[A-Za-z0-9_-]+'),  # JWT
    re.compile(r'\b[A-Za-z0-9]{20,40}\b'),  # generic long tokens (heuristic)
]

_QUEUE: asyncio.Queue[tuple[str, str]] = asyncio.Queue()
_TASK: Optional[asyncio.Task] = None  # type: ignore[type-arg]


def _is_flagged(content: str) -> bool:
    for pattern in _BANNED_PATTERNS:
        if pattern.search(content):
            return True
    return False


async def _worker() -> None:
    async with async_session_factory() as session:
        while True:
            try:
                paste_id, content = await asyncio.wait_for(_QUEUE.get(), timeout=5.0)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            try:
                if _is_flagged(content):
                    from sqlalchemy import select
                    result = await session.execute(select(Paste).where(Paste.id == paste_id))
                    paste = result.scalar_one_or_none()
                    if paste:
                        paste.is_flagged = True
                        paste.visibility = PasteVisibility.PRIVATE
                        await session.commit()
                        logger.warning("sanitizer.paste_flagged", paste_id=paste_id)
            except Exception as exc:
                logger.error("sanitizer.worker_error", paste_id=paste_id, error=str(exc))
                try:
                    await session.rollback()
                except Exception:
                    pass
            finally:
                _QUEUE.task_done()


class SanitizerService:
    async def start(self) -> None:
        global _TASK
        _TASK = asyncio.create_task(_worker())
        logger.info("sanitizer.started")

    async def stop(self) -> None:
        global _TASK
        if _TASK:
            _TASK.cancel()
            try:
                await _TASK
            except asyncio.CancelledError:
                pass
        logger.info("sanitizer.stopped")

    async def enqueue(self, paste_id: str, content: str) -> None:
        await _QUEUE.put((paste_id, content))


sanitizer_service = SanitizerService()
