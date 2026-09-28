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


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    if not path.endswith("/docs"):
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
