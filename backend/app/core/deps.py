from dataclasses import dataclass
from typing import Iterator

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.engine import Connection

from .db import engine, set_context
from .permissions import GLOBAL_ROLES, allowed
from .security import decode

bearer = HTTPBearer(auto_error=False)


@dataclass
class User:
    id: int
    role: str
    site_ids: list[int]
    ip: str | None = None

    @property
    def is_global(self) -> bool:
        return self.role in GLOBAL_ROLES


def current_user(request: Request, cred: HTTPAuthorizationCredentials | None = Depends(bearer)) -> User:
    if cred is None:
        raise HTTPException(401, "Not authenticated")
    data = decode(cred.credentials, "access")
    if data is None:
        raise HTTPException(401, "Invalid or expired token")
    return User(int(data["sub"]), data["role"], list(data.get("site_ids") or []),
                request.client.host if request.client else None)


def require(perm: str):
    def dep(user: User = Depends(current_user)) -> User:
        if not allowed(user.role, perm):
            raise HTTPException(403, f"Role {user.role} lacks permission {perm}")
        return user
    dep.permission = perm  # read by the RBAC matrix test
    return dep


def db(user: User = Depends(current_user)) -> Iterator[Connection]:
    """One transaction per request, scoped for RLS. Commits on success."""
    with engine().begin() as conn:
        set_context(conn, user.role, user.site_ids, user.id)
        yield conn
