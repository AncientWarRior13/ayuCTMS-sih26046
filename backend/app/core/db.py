from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from .config import get_settings

_engine: Engine | None = None


def engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(
            get_settings().clean_database_url,
            pool_pre_ping=True,
            pool_size=10,
            connect_args={"options": "-c timezone=GMT"},
        )
    return _engine


def reset_engine() -> None:
    global _engine
    if _engine is not None:
        _engine.dispose()
    _engine = None


def set_context(conn: Connection, role: str, site_ids: list[int], user_id: int | None) -> None:
    """Scope the transaction for Postgres RLS policies."""
    conn.execute(
        text(
            "SELECT set_config('app.role', :r, true), set_config('app.site_ids', :s, true),"
            " set_config('app.user_id', :u, true)"
        ),
        {"r": role, "s": ",".join(str(i) for i in site_ids), "u": str(user_id or "")},
    )


@contextmanager
def system_tx() -> Iterator[Connection]:
    """Transaction for background jobs; runs with global (ADMIN) visibility."""
    with engine().begin() as conn:
        set_context(conn, "ADMIN", [], None)
        yield conn
