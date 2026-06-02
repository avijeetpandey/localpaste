"""Schema-level tests."""
import pytest
from pydantic import ValidationError

from app.schemas.paste import ExpirationOption, PasteCreate
from app.schemas.user import UserCreate


class TestUserSchemas:
    def test_valid_user_create(self):
        u = UserCreate(email="a@b.com", username="alice", password="strongpass1")
        assert u.email == "a@b.com"
        assert u.username == "alice"

    def test_short_password(self):
        with pytest.raises(ValidationError):
            UserCreate(email="a@b.com", username="alice", password="short")

    def test_invalid_username(self):
        with pytest.raises(ValidationError):
            UserCreate(email="a@b.com", username="bad name!", password="goodpassword")


class TestPasteSchemas:
    def test_defaults(self):
        p = PasteCreate(content="hello")
        assert p.title == "Untitled"
        assert p.language == "plaintext"
        assert p.expiration is ExpirationOption.NEVER
        assert p.burn_after_read is False
        assert p.encrypt is False

    def test_empty_content_rejected(self):
        with pytest.raises(ValidationError):
            PasteCreate(content="")
