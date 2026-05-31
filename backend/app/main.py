import colorama
import logging
import sys
colorama.init()

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from .core.rate_limit_middleware import RateLimitMiddleware
from .api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

app = FastAPI(title="re:life", version="0.1.0")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_CSP_HEADER = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:; "
    "style-src 'self' 'unsafe-inline' https:; "
    "img-src 'self' data: https:; "
    "font-src 'self' data: https:; "
    "connect-src 'self' http://localhost:* https://api.openai.com https:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Content-Security-Policy"] = _CSP_HEADER
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(router)

frontend_dist = Path(__file__).parent.parent.parent / "dist"
if not (frontend_dist / "index.html").exists():
    frontend_dist = Path(__file__).parent.parent / "dist"
if (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


@app.get("/health")
async def health():
    return {"status": "ok"}
