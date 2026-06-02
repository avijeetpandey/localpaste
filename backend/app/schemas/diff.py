from pydantic import BaseModel


class DiffLine(BaseModel):
    line_no_old: int | None
    line_no_new: int | None
    content: str
    kind: str  # "equal" | "insert" | "delete"


class DiffResult(BaseModel):
    paste_id: str
    parent_id: str
    additions: int
    deletions: int
    lines: list[DiffLine]
