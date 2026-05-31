"""速率限制中间件 -- 仅限 LLM 端点，防意外脚本"""
import os
import time
import threading
from collections import defaultdict

_LLM_LIMIT = (60, 60)
_LLM_PATHS = {
    "/api/templates/new",
    "/api/templates/import",
}
_LLM_PREFIXES = {
    "/api/game/",
}


class RateLimitMiddleware:
    def __init__(self, app):
        self.app = app
        self._lock = threading.Lock()
        self._windows: dict[str, list[float]] = defaultdict(list)

    @staticmethod
    def _is_llm_endpoint(path: str) -> bool:
        if path in _LLM_PATHS:
            return True
        for prefix in _LLM_PREFIXES:
            if path.startswith(prefix):
                return True
        if path.startswith("/api/templates/") and "modify" in path:
            return True
        return False

    def _check(self, client_ip: str, path: str) -> bool:
        if os.environ.get("DISABLE_RATE_LIMIT") == "1":
            return True
        if not self._is_llm_endpoint(path):
            return True
        max_req, window = _LLM_LIMIT
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
