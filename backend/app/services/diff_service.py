"""Diff service - computes line-by-line diff between paste versions."""
from __future__ import annotations

import difflib
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paste import Paste
from app.schemas.diff import DiffLine, DiffResult
from app.services.storage import storage_service


class DiffServiceError(Exception):
    pass


class DiffService:
    async def compute_diff(self, session: AsyncSession, paste: Paste) -> DiffResult:
        """Compute diff between this paste and its parent."""
        try:
            child_body = await storage_service.get_text(paste.storage_key)
        except FileNotFoundError:
            raise DiffServiceError("Paste body not found in storage")

        parent_body = ""
        if paste.parent_id:
            from sqlalchemy import select
            result = await session.execute(
                select(Paste).where(Paste.id == paste.parent_id)
            )
            parent = result.scalar_one_or_none()
            if parent:
                try:
                    parent_body = await storage_service.get_text(parent.storage_key)
                except FileNotFoundError:
                    parent_body = ""

        old_lines = parent_body.splitlines(keepends=False)
        new_lines = child_body.splitlines(keepends=False)

        diff_lines: list[DiffLine] = []
        additions = 0
        deletions = 0
        unchanged = 0

        matcher = difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for k, line in enumerate(old_lines[i1:i2]):
                    diff_lines.append(DiffLine(
                        line_num_old=i1 + k + 1,
                        line_num_new=j1 + k + 1,
                        content=line,
                        change_type="equal",
                    ))
                    unchanged += 1
            elif tag == "insert":
                for k, line in enumerate(new_lines[j1:j2]):
                    diff_lines.append(DiffLine(
                        line_num_old=None,
                        line_num_new=j1 + k + 1,
                        content=line,
                        change_type="insert",
                    ))
                    additions += 1
            elif tag == "delete":
                for k, line in enumerate(old_lines[i1:i2]):
                    diff_lines.append(DiffLine(
                        line_num_old=i1 + k + 1,
                        line_num_new=None,
                        content=line,
                        change_type="delete",
                    ))
                    deletions += 1
            elif tag == "replace":
                for k, line in enumerate(old_lines[i1:i2]):
                    diff_lines.append(DiffLine(
                        line_num_old=i1 + k + 1,
                        line_num_new=None,
                        content=line,
                        change_type="delete",
                    ))
                    deletions += 1
                for k, line in enumerate(new_lines[j1:j2]):
                    diff_lines.append(DiffLine(
                        line_num_old=None,
                        line_num_new=j1 + k + 1,
                        content=line,
                        change_type="insert",
                    ))
                    additions += 1

        return DiffResult(
            paste_id=paste.id,
            parent_id=paste.parent_id,
            version=paste.version,
            diff_lines=diff_lines,
            additions=additions,
            deletions=deletions,
            unchanged=unchanged,
        )


diff_service = DiffService()
