from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.engine import get_db
from backend.app.schemas.user import UserCreate, UserRead, TokenResponse
from backend.app.services.auth_service import AuthService

router = APIRouter()


async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: UserCreate, svc: AuthService = Depends(get_auth_service)):
    return await svc.register(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserCreate, svc: AuthService = Depends(get_auth_service)):
    return await svc.login(payload)


@router.get("/me", response_model=UserRead)
async def me(svc: AuthService = Depends(get_auth_service)):
    return await svc.get_current_user()
