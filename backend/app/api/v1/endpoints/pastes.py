import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.engine import get_db
from backend.app.schemas.paste import PasteCreate, PasteRead, PasteWithBody

router = APIRouter()


@router.post("/", response_model=PasteRead, status_code=201)
async def create_paste(payload: PasteCreate, db: AsyncSession = Depends(get_db)):
    from backend.app.services.paste_service import PasteService
    svc = PasteService(db)
    return await svc.create(payload)


@router.get("/{key}", response_model=PasteWithBody)
async def get_paste(key: str, db: AsyncSession = Depends(get_db)):
    from backend.app.services.paste_service import PasteService
    svc = PasteService(db)
    paste = await svc.get(key)
    if not paste:
        raise HTTPException(status_code=404, detail="Paste not found")
    return paste


@router.delete("/{key}", status_code=204)
async def delete_paste(key: str, db: AsyncSession = Depends(get_db)):
    from backend.app.services.paste_service import PasteService
    svc = PasteService(db)
    await svc.delete(key)


@router.post("/{key}/fork", response_model=PasteRead, status_code=201)
async def fork_paste(key: str, db: AsyncSession = Depends(get_db)):
    from backend.app.services.paste_service import PasteService
    svc = PasteService(db)
    return await svc.fork(key)
