from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column
from sqlalchemy import DateTime, func


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: MappedColumn = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: MappedColumn = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
