import asyncio
import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

from .core.config import get_settings
from .core.db import engine
from .routers import admin, audit_log, auth, dashboard, interop, participants, pv, quality, studies
from .services.alerts import hub

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
API = "/api/v1"


def _auto_bootstrap_if_needed():
    """If database is empty (e.g. Render free tier without shell access), auto-load schema and seed data."""
    try:
        import sys
        from pathlib import Path
        backend_dir = Path(__file__).resolve().parents[1]
        scripts_dir = backend_dir / "scripts"
        if str(scripts_dir) not in sys.path:
            sys.path.insert(0, str(scripts_dir))

        eng = engine()
        with eng.begin() as conn:
            has_tables = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')"
            )).scalar()
            if not has_tables:
                logging.getLogger("ayuctms").info("Database empty. Auto-creating schema and loading synthetic dataset...")
                schema_path = backend_dir / "db" / "schema.sql"
                if schema_path.exists():
                    raw = conn.connection.driver_connection
                    raw.execute(schema_path.read_text(encoding="utf-8"))
                    logging.getLogger("ayuctms").info("Schema created.")

                # Seed baseline data
                import build_cdisc_ct
                import seed_studies_from_ctri
                import gen_trial_events
                build_cdisc_ct.run(conn)
                ctx = seed_studies_from_ctri.run(conn)
                gen_trial_events.run(conn, ctx)
                logging.getLogger("ayuctms").info("Complete trial data and demo users seeded.")
    except Exception as exc:
        logging.getLogger("ayuctms").warning(f"Auto-bootstrap: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _auto_bootstrap_if_needed()
    task = None
    if get_settings().enable_scheduler:
        task = asyncio.create_task(hub.run(get_settings().alert_tick_seconds))
    yield
    if task:
        task.cancel()


app = FastAPI(title="AyuCTMS API", version="1.0.0", lifespan=lifespan,
              description="Clinical Trial Management System for Ayurveda research (SIH26046)",
              docs_url=f"{API}/docs", openapi_url=f"{API}/openapi.json")

app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["Content-Disposition"])

_hits: dict[tuple[str, str], deque] = defaultdict(deque)
RATE_LIMITED = (f"{API}/auth/login", f"{API}/export/", f"{API}/import/")


@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path
    if request.method != "OPTIONS" and path.startswith(RATE_LIMITED):
        key = (request.client.host if request.client else "?", path.split("/")[3])
        q, now = _hits[key], time.monotonic()
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= get_settings().login_rate_per_min:
            return JSONResponse({"detail": "Too many requests, slow down"}, status_code=429)
        q.append(now)
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Skip CSP on OPTIONS preflight — browsers discard preflight responses with restrictive CSP
    if request.method != "OPTIONS" and not path.endswith("/docs"):
        resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.exception_handler(IntegrityError)
async def integrity(_: Request, exc: IntegrityError):
    return JSONResponse({"detail": "Conflicts with existing data: " + str(exc.orig).split("\n")[0]}, status_code=409)


@app.exception_handler(DBAPIError)
async def dberror(_: Request, exc: DBAPIError):
    msg = str(exc.orig).split("\n")[0]
    if "row-level security" in msg or "permission denied" in msg:
        return JSONResponse({"detail": "Not permitted for your site or role"}, status_code=403)
    if "invalid input value for enum" in msg:
        return JSONResponse({"detail": msg}, status_code=422)
    logging.getLogger("ayuctms").exception("database error")
    return JSONResponse({"detail": "Database error"}, status_code=500)


for r in (auth, studies, participants, quality, pv, dashboard, audit_log, interop, admin):
    app.include_router(r.router, prefix=API)


@app.get(f"{API}/health", tags=["meta"])
def health():
    with engine().connect() as c:
        c.execute(text("SELECT 1"))
    return {"status": "ok"}
