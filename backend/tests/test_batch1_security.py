"""Batch 1 安全加固测试: CORS + 错误信息泄露 + Key 文件删除"""
import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestKeyFileRemoval:
    """1.1: 验证 Key/ 目录和 ds-v4 文件不存在"""

    def test_key_directory_removed(self):
        key_dir = os.path.join(
            os.path.dirname(__file__), "..", "..", "Key"
        )
        assert not os.path.exists(key_dir), (
            "Key/ directory must not exist in the repo working directory"
        )

    def test_key_file_removed(self):
        key_file = os.path.join(
            os.path.dirname(__file__), "..", "..", "Key", "ds-v4"
        )
        assert not os.path.isfile(key_file), (
            "ds-v4 plaintext API key file must not exist"
        )


class TestCORSSecurity:
    """1.2: CORS 不允许陌生 Origin"""

    def test_allowed_origin_localhost_5173(self, client):
        resp = client.options(
            "/health",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
        )
        allow_origin = resp.headers.get("access-control-allow-origin", "")
        assert allow_origin == "http://localhost:5173", (
            f"Expected allowed origin 'http://localhost:5173', got '{allow_origin}'"
        )

    def test_allowed_origin_localhost_8000(self, client):
        resp = client.options(
            "/health",
            headers={"Origin": "http://localhost:8000", "Access-Control-Request-Method": "GET"},
        )
        allow_origin = resp.headers.get("access-control-allow-origin", "")
        assert allow_origin == "http://localhost:8000", (
            f"Expected allowed origin 'http://localhost:8000', got '{allow_origin}'"
        )

    def test_disallowed_origin_blocked(self, client):
        resp = client.options(
            "/health",
            headers={"Origin": "https://evil.com", "Access-Control-Request-Method": "GET"},
        )
        allow_origin = resp.headers.get("access-control-allow-origin", "")
        assert "evil.com" not in allow_origin, (
            f"Disallowed origin leaked in CORS header: '{allow_origin}'"
        )

    def test_no_credentials_allowed(self, client):
        resp = client.options(
            "/health",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
        )
        allow_creds = resp.headers.get("access-control-allow-credentials", "")
        assert allow_creds.lower() != "true", (
            "access-control-allow-credentials must not be 'true'"
        )

    def test_wildcard_not_allowed(self, client):
        resp = client.options(
            "/health",
            headers={"Origin": "http://anything.else.com", "Access-Control-Request-Method": "GET"},
        )
        allow_origin = resp.headers.get("access-control-allow-origin", "")
        assert allow_origin != "*", (
            f"Wildcard origin '*' should not be allowed; got '{allow_origin}'"
        )


class TestErrorMessagesNotLeaked:
    """1.3: LLM 报错不泄露详情到客户端"""

    @pytest.fixture(autouse=True)
    def mock_llm(self, monkeypatch):
        """Patch LLMClient to raise a network error that matches _LLM_ERRORS."""
        async def mock_chat(*args, **kwargs):
            raise OSError("API key sk-abc123 was rejected by upstream")

        monkeypatch.setattr(
            "app.api.routes.llm_client.chat",
            mock_chat,
        )
        monkeypatch.setattr(
            "app.api.routes.llm_client.chat_stream",
            mock_chat,
        )
        monkeypatch.setattr(
            "app.api.routes.prompt_engine.render_system_prompt",
            lambda *a, **kw: "You are a game master.",
        )
        monkeypatch.setattr(
            "app.api.routes.prompt_engine.render_first_message",
            lambda *a, **kw: "Welcome to the game.",
        )
        monkeypatch.setattr(
            "app.api.routes.prompt_engine.load_world",
            lambda *a, **kw: {},
        )
        monkeypatch.setattr(
            "app.api.routes.prompt_engine.load_player",
            lambda *a, **kw: {},
        )
        monkeypatch.setattr(
            "app.api.routes.prompt_engine.load_preferences",
            lambda *a, **kw: {},
        )
        yield

    def test_new_template_does_not_leak_error(self, client):
        resp = client.post(
            "/api/templates/new",
            json={"concept": "a test world concept for security testing"},
        )
        assert resp.status_code == 500
        detail = resp.json()["detail"]
        assert "sk-" not in detail, (
            f"API key leaked in response: {detail}"
        )
        assert "LLM API request failed" in detail, (
            f"Expected generic message, got: {detail}"
        )

    def test_import_template_does_not_leak_error(self, client):
        resp = client.post(
            "/api/templates/import",
            json={"content": "name: test_world\nworld: some content", "filename": "test.txt"},
        )
        assert resp.status_code == 500
        detail = resp.json()["detail"]
        assert "sk-" not in detail, f"API key leaked: {detail}"

    def test_modify_template_does_not_leak_error(self, client):
        resp = client.post(
            "/api/templates/myworld/modify",
            json={"instruction": "modify something"},
        )
        assert resp.status_code == 500
        detail = resp.json()["detail"]
        assert "sk-" not in detail, f"API key leaked: {detail}"

    def test_game_start_does_not_leak_error(self, client):
        resp = client.post("/api/game/new", json={
            "world": "fantasy",
            "player_name": "Alice",
        })
        assert resp.status_code == 200, f"Game creation failed: {resp.json()}"
        game_id = resp.json()["game_id"]
        resp2 = client.post(f"/api/game/{game_id}/start")
        assert resp2.status_code == 500
        detail = resp2.json()["detail"]
        assert "sk-" not in detail, f"API key leaked: {detail}"

    def test_game_action_does_not_leak_error(self, client):
        resp = client.post("/api/game/new", json={
            "world": "fantasy",
            "player_name": "Alice",
        })
        assert resp.status_code == 200, f"Game creation failed: {resp.json()}"
        game_id = resp.json()["game_id"]
        resp2 = client.post(
            f"/api/game/{game_id}/action",
            json={"action": "look around"},
        )
        assert resp2.status_code == 500
        detail = resp2.json()["detail"]
        assert "sk-" not in detail, f"API key leaked: {detail}"
