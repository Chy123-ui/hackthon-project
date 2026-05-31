"""速率限制中间件 -- 基于内存的滑动窗口"""
import os
import time
import threading
from collections import defaultdict


class RateLimitMiddleware:
    def __init__(self, app):
        self.app = app
        self._lock = threading.Lock()
        self._windows: dict[str, list[float]] = defaultdict(list)
        self._limits = {
            "/api/templates/new": (5, 60),
            "/api/templates/import": (5, 60),
            "/api/templates/": (5, 60),
            "/api/game/": (10, 60),
        }
        self._default_limit = (30, 60)

    def _get_limit(self, path: str) -> tuple[int, int]:
        for prefix, limit in self._limits.items():
            if path.startswith(prefix):
                return limit
        return self._default_limit

    def _check(self, client_ip: str, path: str) -> bool:
        if os.environ.get("DISABLE_RATE_LIMIT") == "1":
            return True
        max_req, window = self._get_limit(path)
        now = time.time()
        cutoff = now - window

        with self._lock:
            timestamps = self._windows[client_ip]
            timestamps = [t for t in timestamps if t > cutoff]
            self._windows[client_ip] = timestamps

            if len(timestamps) >= max_req:
                return False

            timestamps.append(now)
            return True

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        if method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "/")
        client_ip = scope.get("client", ("127.0.0.1", 0))[0]

        if not self._check(client_ip, path):
            from starlette.responses import JSONResponse
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please wait and try again."},
                headers={"Retry-After": "60"},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
