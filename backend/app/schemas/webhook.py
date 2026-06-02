import uuid
from typing import Optional
from pydantic import BaseModel, HttpUrl


class WebhookCreate(BaseModel):
    url: str
    secret: Optional[str] = None
    events: list[str] = ["paste.created"]


class WebhookRead(BaseModel):
    id: uuid.UUID
    url: str
    events: list[str]
    is_active: bool

    model_config = {"from_attributes": True}
