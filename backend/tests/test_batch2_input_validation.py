"""Batch 2 输入校验测试: 路径穿越 + 长度限制 + Pydantic schema + player_name"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestPathTraversalPrevention:
    """2.1: world 参数路径穿越防护"""

    def test_dotdot_world_rejected_in_get(self, client):
        resp = client.get("/api/templates/../secret/world")
        assert resp.status_code in (400, 404), (
            f"Path traversal should be rejected, got {resp.status_code}"
        )

    def test_dotdot_world_rejected_in_put(self, client):
        resp = client.put(
            "/api/templates/../secret/world",
            json={},
        )
        assert resp.status_code in (400, 404, 422), (
            f"Path traversal should be rejected, got {resp.status_code}: {resp.json()}"
        )

    def test_dotdot_world_rejected_in_delete(self, client):
        resp = client.delete("/api/templates/../secret")
        assert resp.status_code in (400, 404, 422), (
            f"Path traversal should be rejected, got {resp.status_code}"
        )

    def test_encoded_slash_rejected_in_world(self, client):
        resp = client.get("/api/templates/%2e%2e%2fwindows/world")
        assert resp.status_code in (400, 404, 422), (
            f"Encoded path traversal should be rejected, got {resp.status_code}"
        )

    def test_valid_world_accepted(self, client):
        resp = client.get("/api/templates/fantasy/world")
        assert resp.status_code == 200


class TestInputLengthLimits:
    """2.2: 输入长度限制"""

    def test_action_too_long_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "Test"},
        )
        assert resp.status_code == 200, f"Game creation failed: {resp.json()}"
        game_id = resp.json()["game_id"]

        long_action = "x" * 2001
        resp2 = client.post(
            f"/api/game/{game_id}/action",
            json={"action": long_action},
        )
        assert resp2.status_code == 422, (
            f"Oversized action should be rejected, got {resp2.status_code}"
        )

    def test_action_at_limit_accepted(self, client, monkeypatch):
        monkeypatch.setattr(
            "app.api.routes.prompt_engine.render_system_prompt",
            lambda *a, **kw: "You are a game master.",
        )
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "Test"},
        )
        assert resp.status_code == 200
        game_id = resp.json()["game_id"]

        valid_action = "x" * 2000
        resp2 = client.post(
            f"/api/game/{game_id}/action",
            json={"action": valid_action},
        )
        assert resp2.status_code != 422, (
            f"Action at max length should be accepted by Pydantic, got {resp2.status_code}"
        )

    def test_concept_too_long_rejected(self, client):
        long_concept = "x" * 501
        resp = client.post(
            "/api/templates/new",
            json={"concept": long_concept},
        )
        assert resp.status_code == 422, (
            f"Oversized concept should be rejected, got {resp.status_code}"
        )

    def test_instruction_too_long_rejected(self, client):
        long_instruction = "x" * 1001
        resp = client.post(
            "/api/templates/fantasy/modify",
            json={"instruction": long_instruction},
        )
        assert resp.status_code == 422, (
            f"Oversized instruction should be rejected, got {resp.status_code}"
        )

    def test_empty_action_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "Test"},
        )
        assert resp.status_code == 200
        game_id = resp.json()["game_id"]
        resp2 = client.post(
            f"/api/game/{game_id}/action",
            json={"action": ""},
        )
        assert resp2.status_code == 422, (
            f"Empty action should be rejected, got {resp2.status_code}"
        )

    def test_empty_concept_rejected(self, client):
        resp = client.post(
            "/api/templates/new",
            json={"concept": ""},
        )
        assert resp.status_code == 422, (
            f"Empty concept should be rejected, got {resp.status_code}"
        )


class TestPydanticSchemaValidation:
    """2.3: dict body -> Pydantic model 校验"""

    def test_import_missing_content_ok_optional(self, client):
        resp = client.post(
            "/api/templates/import",
            json={"filename": "test.txt"},
        )
        assert resp.status_code in (400, 422), (
            f"Import without content should fail, got {resp.status_code}"
        )

    def test_generate_world_missing_concept_rejected(self, client):
        resp = client.post(
            "/api/templates/new",
            json={},
        )
        assert resp.status_code == 422, (
            f"Missing concept should be rejected, got {resp.status_code}"
        )

    def test_modify_missing_instruction_rejected(self, client):
        resp = client.post(
            "/api/templates/fantasy/modify",
            json={},
        )
        assert resp.status_code == 422, (
            f"Missing instruction should be rejected, got {resp.status_code}"
        )

    def test_game_action_missing_action_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "Test"},
        )
        assert resp.status_code == 200
        game_id = resp.json()["game_id"]
        resp2 = client.post(
            f"/api/game/{game_id}/action",
            json={},
        )
        assert resp2.status_code == 422, (
            f"Missing action should be rejected, got {resp2.status_code}"
        )


class TestPlayerNameValidation:
    """2.4: player_name 合法校验"""

    def test_empty_player_name_accepted_as_empty(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": ""},
        )
        assert resp.status_code == 200, (
            f"Empty player_name should be accepted (stored as empty), got {resp.status_code}"
        )

    def test_player_name_too_long_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "x" * 31},
        )
        assert resp.status_code == 422, (
            f"Long player_name should be rejected, got {resp.status_code}"
        )

    def test_player_name_special_chars_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "<script>alert(1)</script>"},
        )
        assert resp.status_code == 422, (
            f"Special chars in player_name should be rejected, got {resp.status_code}"
        )

    def test_player_name_newline_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "Alice\nhacked"},
        )
        assert resp.status_code == 422, (
            f"Newline in player_name should be rejected, got {resp.status_code}"
        )

    def test_valid_player_name_accepted(self, client):
        names = ["Alice", "冒险者", "test_user", "Player-1"]
        for name in names:
            resp = client.post(
                "/api/game/new",
                json={"world": "fantasy", "player_name": name},
            )
            assert resp.status_code == 200, (
                f"Valid player_name '{name}' rejected: {resp.json()}"
            )

    def test_player_name_whitespace_only_accepted_as_empty(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "   "},
        )
        assert resp.status_code == 200, (
            f"Whitespace-only player_name should be accepted (trimmed to empty), got {resp.status_code}"
        )


class TestWorldNameValidation:
    """2.a: world 名称校验 (NewGameRequest)"""

    def test_dotdot_world_sanitized_not_rejected(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "../secret", "player_name": "Test"},
        )
        assert resp.status_code == 200, (
            f"Sanitized world should be accepted, got {resp.status_code}"
        )
        result = resp.json()
        assert result["world"] == "secret", (
            f"World should be sanitized to 'secret', got '{result['world']}'"
        )

    def test_valid_world_accepted_in_new_game(self, client):
        resp = client.post(
            "/api/game/new",
            json={"world": "fantasy", "player_name": "Test"},
        )
        assert resp.status_code == 200, (
            f"Valid world should be accepted, got {resp.status_code}"
        )
