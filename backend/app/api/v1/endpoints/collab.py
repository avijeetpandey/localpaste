from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio

router = APIRouter()


@router.get("/{paste_key}/stream")
async def collab_stream(paste_key: str):
    async def event_generator():
        while True:
            yield f"data: heartbeat\n\n"
            await asyncio.sleep(15)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
