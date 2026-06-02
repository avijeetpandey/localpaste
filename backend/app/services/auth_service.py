"""Auth service - registration, login, token validation."""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin


class AuthError(Exception):
    """Raised for any authentication-related failure."""


class AuthService:
    async def register(self, session: AsyncSession, payload: UserCreate) -> User:
        existing = await session.execute(
            select(User).where(or_(User.email == payload.email, User.username == payload.username))
        )
        if existing.scalar_one_or_none():
            raise AuthError("A user with that email or username already exists")
        user = User(
            email=payload.email.lower(),
            username=payload.username,
            password_hash=hash_password(payload.password),
        )
        session.add(user)
        await session.flush()
        await session.commit()
        await session.refresh(user)
        return user

    async def authenticate(self, session: AsyncSession, payload: UserLogin) -> User:
        result = await session.execute(select(User).where(User.email == payload.email.lower()))
        user = result.scalar_one_or_none()
        if user is None or not verify_password(payload.password, user.password_hash):
            raise AuthError("Invalid email or password")
        if not user.is_active:
            raise AuthError("Account is disabled")
        return user

    async def get_user_by_id(self, session: AsyncSession, user_id: str) -> Optional[User]:
        try:
            uid = uuid.UUID(str(user_id))
        except ValueError:
            return None
        result = await session.execute(select(User).where(User.id == uid))
        return result.scalar_one_or_none()

    def issue_token(self, user: User) -> str:
        return create_access_token(
            subject=str(user.id),
            extra_claims={"email": user.email, "username": user.username},
        )


auth_service = AuthService()
