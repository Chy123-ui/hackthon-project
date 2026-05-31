"""Bug 修复测试: 模板保存不丢数据 + 合并保存端点 + 空角色名"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestTemplateSaveNotWiped:
    """Bug 1: TemplateUpdate 空模型不会清空数据"""

    def test_put_template_keeps_extra_fields(self, client):
        payload = {"name": "My World", "description": "Test desc", "custom_field": "keep me"}
        resp = client.put("/api/templates/testbug1/world", json=payload)
        assert resp.status_code == 200, f"Save failed: {resp.json()}"

        resp2 = client.get("/api/templates/testbug1/world")
        assert resp2.status_code == 200
        data = resp2.json()
        assert data.get("name") == "My World", f"name lost: {data}"
        assert data.get("description") == "Test desc", f"description lost: {data}"
        assert data.get("custom_field") == "keep me", f"custom_field lost: {data}"


class TestMergedTemplateSave:
    """Bug 3: 合并 PUT /templates/{world} 一次保存所有"""

    def test_merged_save_all_three_parts(self, client):
        payload = {
            "world": {"name": "Merged World", "description": "A merged test"},
            "player": {"name": "Hero", "class": "Knight"},
            "preferences": {"tone": "dark", "pacing": "fast"},
        }
        resp = client.put("/api/templates/testbug3", json=payload)
        assert resp.status_code == 200, f"Merge save failed: {resp.json()}"

        rw = client.get("/api/templates/testbug3/world")
        assert rw.json()["name"] == "Merged World"

        rp = client.get("/api/templates/testbug3/player")
        assert rp.json()["class"] == "Knight"

        rpref = client.get("/api/templates/testbug3/preferences")
        assert rpref.json()["tone"] == "dark"

    def test_merged_save_partial_ok(self, client):
        resp = client.put("/api/templates/testbug3_partial", json={
            "world": {"name": "Partial"},
        })
        assert resp.status_code == 200

        rw = client.get("/api/templates/testbug3_partial/world")
        assert rw.json()["name"] == "Partial"

        rp = client.get("/api/templates/testbug3_partial/player")
        assert isinstance(rp.json(), dict), rp.json()

    def test_merged_save_empty_body_ok(self, client):
        resp = client.put("/api/templates/testbug3_empty", json={})
        assert resp.status_code == 200


class TestEmptyPlayerNameFallback:
    """Bug 2: 空角色名 -- 模板名优先，session 名可覆盖"""

    def test_session_name_overrides_template(self):
        from app.core.prompt_engine import PromptEngine
        engine = PromptEngine()

        ctx = engine.build_context("fantasy", "Alice")
        assert ctx.get("player_name") == "Alice", (
            f"Session name should override template: {ctx.get('player_name')}"
        )

    def test_empty_session_uses_template_name(self):
        from app.core.prompt_engine import PromptEngine
        engine = PromptEngine()

        ctx = engine.build_context("fantasy", "")
        assert ctx.get("player_name"), (
            f"Empty session should fall back to template name or default"
        )

    def test_default_fallback_when_both_empty(self):
        from app.core.prompt_engine import PromptEngine
        engine = PromptEngine()

        ctx = engine.build_context("nonexistent_world", "")
        assert ctx.get("player_name") == "冒险者", (
            f"When both empty, should fall back to 冒险者: {ctx.get('player_name')}"
        )
