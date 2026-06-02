import uuid
from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str
    slug: str


class WorkspaceRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class InviteMember(BaseModel):
    email: str
    role: str = "viewer"
