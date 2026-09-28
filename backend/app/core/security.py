import base64
import hashlib
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from cryptography.fernet import Fernet
from jose import JWTError, jwt

from .config import get_settings

_ph = PasswordHasher()  # argon2id
ALGO = "HS256"


def hash_password(pw: str) -> str:
    return _ph.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, pw)
    except Exception:
        return False


def _token(sub: int, role: str, site_ids: list[int], kind: str, ttl: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(sub), "role": role, "site_ids": site_ids, "typ": kind, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGO)


def access_token(sub: int, role: str, site_ids: list[int]) -> str:
    return _token(sub, role, site_ids, "access", timedelta(minutes=get_settings().access_ttl_min))


def refresh_token(sub: int, role: str, site_ids: list[int]) -> str:
    return _token(sub, role, site_ids, "refresh", timedelta(days=get_settings().refresh_ttl_days))


def decode(token: str, kind: str = "access") -> dict | None:
    try:
        data = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGO])
    except JWTError:
        return None
    return data if data.get("typ") == kind else None


def _fernet() -> Fernet:
    key = hashlib.sha256(get_settings().pii_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_pii(value: str | None) -> bytes | None:
    return None if value is None else _fernet().encrypt(value.encode())


def decrypt_pii(value) -> str | None:
    return None if value is None else _fernet().decrypt(bytes(value)).decode()


def sha256_hex(data: str | bytes) -> str:
    return hashlib.sha256(data.encode() if isinstance(data, str) else data).hexdigest()
