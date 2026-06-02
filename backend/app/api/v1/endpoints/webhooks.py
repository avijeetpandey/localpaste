import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.engine import get_db
from backend.app.schemas.webhook import WebhookCreate, WebhookRead

router = APIRouter()


@router.get("/", response_model=list[WebhookRead])
async def list_webhooks(db: AsyncSession = Depends(get_db)):
    return []


@router.post("/", response_model=WebhookRead, status_code=201)
async def create_webhook(payload: WebhookCreate, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    pass
