"""Pure unit tests that don't need infra (Postgres / Redis / MinIO)."""
import pytest

from app.core.base62 import decode_str, encode_int, is_valid_key, random_key
from app.core.encryption import decrypt_text, encrypt_text
from app.core.security import create_access_token, decode_token, hash_password, verify_password


class TestBase62:
    def test_round_trip(self):
        for n in [0, 1, 61, 62, 1000, 9_999_999, 2**40]:
            assert decode_str(encode_int(n)) == n

    def test_random_key_length(self):
        assert len(random_key(6)) == 6
        assert len(random_key(10)) == 10

    def test_random_key_charset(self):
        for _ in range(50):
            k = random_key(8)
            assert is_valid_key(k, length=8)

    def test_invalid_chars(self):
        with pytest.raises(ValueError):
            decode_str("abc!")
        assert is_valid_key("") is False
        assert is_valid_key("ab", length=3) is False


class TestEncryption:
    def test_round_trip(self):
        enc = encrypt_text("hello world")
        assert decrypt_text(enc.ciphertext_b64, enc.nonce_b64) == "hello world"

    def test_unicode(self):
        msg = "héllo 🌍 ünïcödé"
        enc = encrypt_text(msg)
        assert decrypt_text(enc.ciphertext_b64, enc.nonce_b64) == msg

    def test_tampered_ciphertext_fails(self):
        enc = encrypt_text("data")
        with pytest.raises(Exception):
            decrypt_text("AAAA" + enc.ciphertext_b64[4:], enc.nonce_b64)


class TestSecurity:
    def test_password_round_trip(self):
        h = hash_password("supersecret")
        assert verify_password("supersecret", h) is True
        assert verify_password("wrong", h) is False

    def test_token_round_trip_no_expiry(self):
        tok = create_access_token("user-123", {"role": "admin"})
        decoded = decode_token(tok)
        assert decoded["sub"] == "user-123"
        assert decoded["role"] == "admin"
        assert "exp" not in decoded  # no expiry per project requirement
