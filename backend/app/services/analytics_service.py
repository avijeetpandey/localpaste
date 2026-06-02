"""Analytics service - tracks paste events to ClickHouse."""
from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_BATCH_SIZE = 100
_FLUSH_INTERVAL = 10.0  # seconds
_QUEUE: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
_TASK: Optional[asyncio.Task] = None  # type: ignore[type-arg]
_CLIENT = None
_CONNECTED = False


class AnalyticsService:
    async def connect(self) -> None:
        global _CLIENT, _CONNECTED
        try:
            import clickhouse_connect
            _CLIENT = clickhouse_connect.get_client(
                host=settings.clickhouse_host,
                port=settings.clickhouse_port,
                username=settings.clickhouse_user,
                password=settings.clickhouse_password,
                database=settings.clickhouse_database,
            )
            _CLIENT.ping()
            _CONNECTED = True
            logger.info("analytics.clickhouse_connected")
        except Exception as exc:
            _CONNECTED = False
            logger.warning("analytics.clickhouse_unavailable", error=str(exc))

    async def start(self) -> None:
        global _TASK
        _TASK = asyncio.create_task(self._flush_loop())
        logger.info("analytics.started")

    async def stop(self) -> None:
        global _TASK
        if _TASK:
            _TASK.cancel()
            try:
                await _TASK
            except asyncio.CancelledError:
                pass
        await self._flush_batch()
        logger.info("analytics.stopped")

    async def track(
        self,
        paste_id: str,
        event_type: str,
        user_id: Optional[uuid.UUID] = None,
        ip: str = "",
        referer: str = "",
    ) -> None:
        await _QUEUE.put({
            "paste_id": paste_id,
            "event_type": event_type,
            "user_id": str(user_id) if user_id else "",
            "ip": ip,
            "referer": referer,
            "ts": datetime.now(timezone.utc).isoformat(),
        })

    async def _flush_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(_FLUSH_INTERVAL)
                await self._flush_batch()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("analytics.flush_loop_error", error=str(exc))

    async def _flush_batch(self) -> None:
        if not _CONNECTED or _CLIENT is None:
            # Drain the queue silently when ClickHouse is unavailable
            while not _QUEUE.empty():
                try:
                    _QUEUE.get_nowait()
                    _QUEUE.task_done()
                except asyncio.QueueEmpty:
                    break
            return

        batch: List[Dict[str, Any]] = []
        while not _QUEUE.empty() and len(batch) < _BATCH_SIZE:
            try:
                item = _QUEUE.get_nowait()
                batch.append(item)
                _QUEUE.task_done()
            except asyncio.QueueEmpty:
                break

        if not batch:
            return

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._insert_sync, batch)
            logger.info("analytics.flushed", count=len(batch))
        except Exception as exc:
            logger.error("analytics.flush_error", error=str(exc))

    def _insert_sync(self, batch: List[Dict[str, Any]]) -> None:
        rows = [
            [
                item["paste_id"],
                item["event_type"],
                item["user_id"],
                item["ip"],
                item["referer"],
                item["ts"],
            ]
            for item in batch
        ]
        _CLIENT.insert(  # type: ignore[union-attr]
            "paste_events",
            rows,
            column_names=["paste_id", "event_type", "user_id", "ip", "referer", "ts"],
        )

    async def get_paste_analytics(self, paste_id: str) -> Dict[str, Any]:
        if not _CONNECTED or _CLIENT is None:
            return {
                "paste_id": paste_id,
                "total_views": 0,
                "unique_visitors": 0,
                "hourly": [],
                "top_referers": [],
                "first_seen": None,
                "last_seen": None,
                "error": "ClickHouse unavailable",
            }
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._query_analytics_sync, paste_id)
        except Exception as exc:
            logger.error("analytics.query_error", error=str(exc))
            return {
                "paste_id": paste_id,
                "total_views": 0,
                "unique_visitors": 0,
                "hourly": [],
                "top_referers": [],
                "first_seen": None,
                "last_seen": None,
                "error": str(exc),
            }

    def _query_analytics_sync(self, paste_id: str) -> Dict[str, Any]:
        # Total views
        total_result = _CLIENT.query(  # type: ignore[union-attr]
            "SELECT count() as cnt FROM paste_events WHERE paste_id = {paste_id:String} AND event_type = 'view'",
            parameters={"paste_id": paste_id},
        )
        total_views = total_result.first_row[0] if total_result.first_row else 0

        # Unique visitors
        unique_result = _CLIENT.query(  # type: ignore[union-attr]
            "SELECT uniqExact(ip) as cnt FROM paste_events WHERE paste_id = {paste_id:String} AND event_type = 'view'",
            parameters={"paste_id": paste_id},
        )
        unique_visitors = unique_result.first_row[0] if unique_result.first_row else 0

        # Hourly stats
        hourly_result = _CLIENT.query(  # type: ignore[union-attr]
            """
            SELECT
                toStartOfHour(parseDateTimeBestEffort(ts)) as hour,
                count() as event_count,
                uniqExact(ip) as unique_ips
            FROM paste_events
            WHERE paste_id = {paste_id:String} AND event_type = 'view'
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT 24
            """,
            parameters={"paste_id": paste_id},
        )
        hourly = [
            {"hour": str(row[0]), "event_count": row[1], "unique_ips": row[2]}
            for row in (hourly_result.result_rows or [])
        ]

        # Top referers
        referer_result = _CLIENT.query(  # type: ignore[union-attr]
            """
            SELECT referer, count() as cnt
            FROM paste_events
            WHERE paste_id = {paste_id:String} AND event_type = 'view' AND referer != ''
            GROUP BY referer
            ORDER BY cnt DESC
            LIMIT 10
            """,
            parameters={"paste_id": paste_id},
        )
        top_referers = [
            {"referer": row[0], "count": row[1]}
            for row in (referer_result.result_rows or [])
        ]

        # First/last seen
        time_result = _CLIENT.query(  # type: ignore[union-attr]
            """
            SELECT min(parseDateTimeBestEffort(ts)), max(parseDateTimeBestEffort(ts))
            FROM paste_events
            WHERE paste_id = {paste_id:String}
            """,
            parameters={"paste_id": paste_id},
        )
        first_seen = None
        last_seen = None
        if time_result.first_row:
            first_seen = str(time_result.first_row[0]) if time_result.first_row[0] else None
            last_seen = str(time_result.first_row[1]) if time_result.first_row[1] else None

        return {
            "paste_id": paste_id,
            "total_views": total_views,
            "unique_visitors": unique_visitors,
            "hourly": hourly,
            "top_referers": top_referers,
            "first_seen": first_seen,
            "last_seen": last_seen,
        }


analytics_service = AnalyticsService()
