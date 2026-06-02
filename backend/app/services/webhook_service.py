"""Webhook delivery service."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.core.logging import get_logger
from app.db.base import async_session_factory

logger = get_logger(__name__)

_QUEUE: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
_TASK: Optional[asyncio.Task] = None  # type: ignore[type-arg]
_MAX_RETRIES = 3
_RETRY_DELAY = 2.0


def _sign_payload(secret: str, payload: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def _deliver(target_url: str, secret: str, event: str, body: bytes) -> bool:
    sig = _sign_payload(secret, body)
    headers = {
        "Content-Type": "application/json",
        "X-LocalPaste-Event": event,
        "X-LocalPaste-Signature": sig,
        "User-Agent": "LocalPaste-Webhook/1.0",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(target_url, content=body, headers=headers)
        return 200 <= resp.status_code < 300


async def _worker() -> None:
    while True:
        try:
            item = await asyncio.wait_for(_QUEUE.get(), timeout=5.0)
        except asyncio.TimeoutError:
            continue
        except asyncio.CancelledError:
            break

        owner_id = item["owner_id"]
        event = item["event"]
        data = item["data"]
        body = json.dumps(data).encode()

        try:
            async with async_session_factory() as session:
                from sqlalchemy import select
                from app.models.webhook import WebhookConfig
                result = await session.execute(
                    select(WebhookConfig).where(
                        WebhookConfig.owner_id == owner_id,
                        WebhookConfig.is_active == True,  # noqa: E712
                    )
                )
                hooks = list(result.scalars().all())

            for hook in hooks:
                try:
                    import json as _json
                    hook_events = _json.loads(hook.events) if isinstance(hook.events, str) else hook.events
                except Exception:
                    hook_events = []

                if event not in hook_events and "*" not in hook_events:
                    continue

                success = False
                for attempt in range(_MAX_RETRIES):
                    try:
                        success = await _deliver(hook.target_url, hook.secret_token, event, body)
                        if success:
                            break
                    except Exception as exc:
                        logger.warning("webhook.delivery_error", hook_id=str(hook.id), attempt=attempt, error=str(exc))
                    await asyncio.sleep(_RETRY_DELAY * (attempt + 1))

                async with async_session_factory() as session2:
                    from sqlalchemy import select as _select
                    from app.models.webhook import WebhookConfig as _WC
                    r2 = await session2.execute(_select(_WC).where(_WC.id == hook.id))
                    h2 = r2.scalar_one_or_none()
                    if h2:
                        if success:
                            h2.last_triggered_at = datetime.now(timezone.utc)
                            h2.failure_count = 0
                        else:
                            h2.failure_count = (h2.failure_count or 0) + 1
                            if h2.failure_count >= 10:
                                h2.is_active = False
                                logger.warning("webhook.auto_disabled", hook_id=str(hook.id))
                        await session2.commit()
        except Exception as exc:
            logger.error("webhook.worker_error", error=str(exc))
        finally:
            _QUEUE.task_done()


class WebhookService:
    async def start_consumer(self) -> None:
        global _TASK
        _TASK = asyncio.create_task(_worker())
        logger.info("webhook_service.started")

    async def dispatch(self, owner_id: uuid.UUID, event: str, data: Dict[str, Any]) -> None:
        await _QUEUE.put({"owner_id": owner_id, "event": event, "data": data})


webhook_service = WebhookService()
