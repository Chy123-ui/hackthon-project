"""Batch 5 速率限制测试"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.mark.enable_rate_limit
class TestRateLimiting:
    """5.1+5.2: 速率限制中间件"""

    def test_health_endpoint_not_rate_limited(self, client):
        for _ in range(10):
            resp = client.get("/health")
            assert resp.status_code == 200, (
                f"Health endpoint should not be rate limited"
            )

    def test_config_endpoint_not_rate_limited(self, client):
        for _ in range(5):
            resp = client.get("/api/config")
            assert resp.status_code not in (429,), (
                f"Config GET should not be rate limited: {resp.status_code}"
            )

    def test_llm_endpoint_rate_limited(self, client):
        hit_limit = False
        for i in range(10):
            resp = client.post(
                "/api/templates/new",
                json={"concept": f"test concept {i}"},
            )
            if resp.status_code == 429:
                hit_limit = True
                detail = resp.json().get("detail", "")
                assert "Rate limit exceeded" in detail, (
                    f"429 response should contain 'Rate limit exceeded': {detail}"
                )
                break
            assert resp.status_code in (200, 422, 500), (
                f"Unexpected status: {resp.status_code}"
            )
        assert hit_limit, (
            f"Rate limit should have been hit after 5+ requests to LLM endpoint"
        )

    def test_non_llm_endpoint_can_still_work(self, client):
        for i in range(10):
            resp = client.post(
                "/api/templates/new",
                json={"concept": f"burst {i}"},
            )
            if resp.status_code == 429:
                break

        resp = client.get("/health")
        assert resp.status_code == 200, (
            f"Health endpoint should work even after LLM rate limit"
        )

        resp2 = client.get("/api/config")
        assert resp2.status_code not in (429,), (
            f"Config endpoint should work even after LLM rate limit"
        )

    def test_429_response_has_retry_header(self, client):
        for i in range(10):
            resp = client.post(
                "/api/templates/new",
                json={"concept": f"retry test {i}"},
            )
            if resp.status_code == 429:
                assert "Retry-After" in resp.headers, (
                    "429 response should have Retry-After header"
                )
                break
