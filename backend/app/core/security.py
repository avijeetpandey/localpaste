import base64
import os
import string
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

BASE62_CHARS = string.digits + string.ascii_letters
_BASE = 62


def base62_encode(num: int) -> str:
    if num == 0:
        return BASE62_CHARS[0]
    result = []
    while num:
        num, rem = divmod(num, _BASE)
        result.append(BASE62_CHARS[rem])
    return "".join(reversed(result))


def base62_decode(s: str) -> int:
    result = 0
    for char in s:
        result = result * _BASE + BASE62_CHARS.index(char)
    return result


def generate_key(length: int = 6) -> str:
    num = int.from_bytes(os.urandom(8), "big") % (_BASE ** length)
    key = base62_encode(num)
    return key.zfill(length)


def aes_gcm_encrypt(plaintext: bytes, key: bytes) -> bytes:
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext, None)
    return nonce + ct


def aes_gcm_decrypt(ciphertext: bytes, key: bytes) -> bytes:
    nonce, ct = ciphertext[:12], ciphertext[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None)


def random_aes_key() -> bytes:
    return os.urandom(32)
