from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base, TimestampMixin


class KgsKey(Base, TimestampMixin):
    __tablename__ = "kgs_keys"

    key: Mapped[str] = mapped_column(String(10), primary_key=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
