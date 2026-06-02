import uuid
from typing import Optional
from pydantic import BaseModel, field_validator
import json


class PasteCreate(BaseModel):
    title: Optional[str] = None
    body: str
    language: str = "plaintext"
    visibility: str = "public"
    burn_after_read: bool = False
    is_zk_encrypted: bool = False
    expires_in_seconds: Optional[int] = None
    allowed_ips: Optional[str] = None
    workspace_id: Optional[uuid.UUID] = None

    @field_validator("allowed_ips", mode="before")
    @classmethod
    def parse_allowed_ips(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return v
        return v


class PasteRead(BaseModel):
    id: uuid.UUID
    key: str
    title: Optional[str]
    language: str
    visibility: str
    burn_after_read: bool
    is_zk_encrypted: bool
    is_encrypted: bool
    is_burned: bool
    is_flagged: bool
    view_count: int
    fork_count: int
    version: int
    parent_id: Optional[uuid.UUID]
    expires_at: Optional[str]

    model_config = {"from_attributes": True}


class PasteWithBody(PasteRead):
    body: Optional[str] = None
