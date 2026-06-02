import uuid
from typing import Optional
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, TimestampMixin


class Paste(Base, TimestampMixin):
    __tablename__ = "pastes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(50), default="plaintext")
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    body_object_key: Mapped[str] = mapped_column(String(255), nullable=False)
    body_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    encryption_iv: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_zk_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    burn_after_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_burned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    allowed_ips: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    expires_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    fork_count: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("pastes.id"), nullable=True
    )
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    workspace_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("workspaces.id"), nullable=True
    )

    owner: Mapped[Optional["User"]] = relationship("User", back_populates="pastes")
    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace")
    forks: Mapped[list["Paste"]] = relationship(
        "Paste", foreign_keys=[parent_id], lazy="select"
    )
