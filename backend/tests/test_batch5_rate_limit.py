"""Batch 5 速率限制测试"""
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestLLMEndpointDetection:
    """5.1: LLM 端点识别"""

    def test_llm_paths_identified(self):
        from app.core.rate_limit_middleware import RateLimitMiddleware

        llm = [
            "/api/templates/new",
            "/api/templates/import",
            "/api/templates/fantasy/modify",
            "/api/templates/any/modify-suggestions",
            "/api/game/abc123/start",
            "/api/game/abc123/action",
            "/api/game/abc123/action/stream",
        ]
        for path in llm:
            assert RateLimitMiddleware._is_llm_endpoint(path), (
                f"Should be LLM endpoint: {path}"
            )

    def test_non_llm_paths_not_identified(self):
        from app.core.rate_limit_middleware import RateLimitMiddleware

        non_llm = [
            "/health",
            "/api/config",
            "/api/templates",
            "/api/templates/fantasy/world",
            "/api/templates/fantasy/player",
            "/api/templates/fantasy/preferences",
            "/api/templates/fantasy/export",
            "/api/templates/core/protocol",
        ]
        for path in non_llm:
            assert not RateLimitMiddleware._is_llm_endpoint(path), (
                f"Should NOT be LLM endpoint: {path}"
            )


class TestRateLimitLogic:
    """5.2: 限流逻辑验证 (单元级)"""

    def test_non_llm_always_passes(self, monkeypatch):
        from app.core.rate_limit_middleware import RateLimitMiddleware
        monkeypatch.setenv("DISABLE_RATE_LIMIT", "0")
        m = RateLimitMiddleware(None)
        for i in range(200):
            assert m._check("127.0.0.1", "/health"), (
                f"Non-LLM endpoint should never be blocked"
            )

    def test_llm_endpoint_blocked_after_limit(self, monkeypatch):
        from app.core.rate_limit_middleware import RateLimitMiddleware
        monkeypatch.setenv("DISABLE_RATE_LIMIT", "0")
        m = RateLimitMiddleware(None)
        path = "/api/templates/new"
        passed = 0
        blocked = 0
        for _ in range(65):
            if m._check("127.0.0.1", path):
                passed += 1
            else:
                blocked += 1
        assert passed == 60, f"Expected 60 passed, got {passed}"
        assert blocked >= 5, f"Expected >= 5 blocked, got {blocked}"

    def test_disable_env_bypasses_llm_limit(self, monkeypatch):
        from app.core.rate_limit_middleware import RateLimitMiddleware
        monkeypatch.setenv("DISABLE_RATE_LIMIT", "1")
        m = RateLimitMiddleware(None)
        for i in range(80):
            assert m._check("127.0.0.1", "/api/templates/new"), (
                f"DISABLE_RATE_LIMIT should bypass all checking"
            )


class TestIntegrationBasic:
    """5.3: 集成基本行为"""

    def test_health_never_blocked(self, client):
        for _ in range(30):
            resp = client.get("/health")
            assert resp.status_code != 429

    def test_config_get_never_blocked(self, client):
        for _ in range(30):
            resp = client.get("/api/config")
            assert resp.status_code != 429

    def test_templates_list_never_blocked(self, client):
        for _ in range(30):
            resp = client.get("/api/templates")
            assert resp.status_code != 429

    def test_options_preflight_not_blocked(self, client):
        for _ in range(30):
            resp = client.options("/api/templates/new")
            assert resp.status_code != 429
