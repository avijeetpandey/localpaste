import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.engine import get_db
from backend.app.schemas.workspace import WorkspaceCreate, WorkspaceRead, InviteMember

router = APIRouter()


@router.get("/", response_model=list[WorkspaceRead])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    return []


@router.post("/", response_model=WorkspaceRead, status_code=201)
async def create_workspace(payload: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError


@router.post("/{slug}/members", status_code=201)
async def invite_member(slug: str, payload: InviteMember, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError
