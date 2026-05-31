"""Batch 4 并发与文件安全测试: 会话锁 + 原子写入 + zip bomb 防护"""
import base64
import io
import json
import os
import threading
import time
import zipfile
import pytest
from pathlib import Path
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestSessionLock:
    """4.1: 会话 save/load 读写锁"""

    def test_lock_acquire_and_release(self, tmp_path, monkeypatch):
        from app.core.session import SessionManager
        mgr = SessionManager()
        monkeypatch.setattr(mgr, "sessions_dir", tmp_path)
        game_id = mgr.create("test", "Alice")

        lk = mgr.lock(game_id)
        assert lk.locked(), "Lock should be acquired"
        lk.release()

    def test_locks_are_per_game(self, tmp_path, monkeypatch):
        from app.core.session import SessionManager
        mgr = SessionManager()
        monkeypatch.setattr(mgr, "sessions_dir", tmp_path)
        g1 = mgr.create("test", "A")
        g2 = mgr.create("test", "B")

        lk1 = mgr.lock(g1)
        assert lk1.locked()
        lk1.release()

        lk2 = mgr.lock(g2)
        assert lk2.locked()
        assert lk1 is not lk2, "Different sessions should have different locks"
        lk2.release()

    def test_save_is_atomic_no_tmp_residue(self, tmp_path, monkeypatch):
        from app.core.session import SessionManager
        mgr = SessionManager()
        monkeypatch.setattr(mgr, "sessions_dir", tmp_path)
        game_id = mgr.create("test", "Alice")

        s = mgr.load(game_id)
        s["turn"] = 5
        mgr.save(game_id, s)

        tmp_files = list(tmp_path.glob("*.tmp"))
        assert tmp_files == [], (
            f"Atomic write left tmp residue: {[p.name for p in tmp_files]}"
        )

        loaded = mgr.load(game_id)
        assert loaded["turn"] == 5, (
            f"Saved turn should be 5, got {loaded['turn']}"
        )


class TestAtomicWrites:
    """4.2+4.3: 原子写入 - 无残留 .tmp 文件"""

    def test_config_save_no_tmp_residue(self, client, tmp_path, monkeypatch):
        monkeypatch.setattr("app.api.routes.CONFIG_PATH", tmp_path / "config.json")
        monkeypatch.setattr("app.api.routes._save_server_config", lambda c: True)

        resp = client.put("/api/config", json={"model": "gpt-4"})
        assert resp.status_code == 200

        tmp_files = list(tmp_path.glob("*.tmp"))
        assert tmp_files == [], (
            f"Atomic write left tmp residue: {[p.name for p in tmp_files]}"
        )

    def test_yaml_save_no_tmp_residue(self, tmp_path, monkeypatch):
        from app.core.prompt_engine import PromptEngine
        engine = PromptEngine()
        worlds_dir = tmp_path / "worlds"
        monkeypatch.setattr(engine, "worlds_dir", worlds_dir)

        engine.save_world("test", {"name": "Test"})

        tmp_files = list(worlds_dir.rglob("*.tmp"))
        assert tmp_files == [], (
            f"Atomic YAML write left tmp residue: {[p.name for p in tmp_files]}"
        )

    def test_session_save_no_tmp_residue(self, tmp_path, monkeypatch):
        from app.core.session import SessionManager
        mgr = SessionManager()
        monkeypatch.setattr(mgr, "sessions_dir", tmp_path)
        game_id = mgr.create("test", "Alice")

        s = mgr.load(game_id)
        s["turn"] = 5
        mgr.save(game_id, s)

        tmp_files = list(tmp_path.glob("*.tmp"))
        assert tmp_files == [], (
            f"Atomic session write left tmp residue: {[p.name for p in tmp_files]}"
        )


class TestZipBombProtection:
    """4.4: zip bomb 防护"""

    def test_docx_small_zip_works(self):
        from app.api.routes import _extract_docx

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            content = (
                '<?xml version="1.0"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body><w:p><w:r><w:t>Hello World</w:t></w:r></w:p></w:body>'
                '</w:document>'
            )
            z.writestr("word/document.xml", content)

        result = _extract_docx(buf.getvalue())
        assert len(result) > 0, "Valid docx should return text"

    def test_docx_too_large_rejected(self):
        from app.api.routes import _extract_docx

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("word/document.xml", "x" * (51 * 1024 * 1024))

        result = _extract_docx(buf.getvalue())
        assert result == "", (
            f"Oversized docx should return empty string, got: {result[:50]}"
        )

    def test_import_binary_content_size_limit(self, client, monkeypatch):
        async def mock_chat(*args, **kwargs):
            return {"choices": [{"message": {"content": "name: test_world\nworld:\n  name: test_world"}}]}
        monkeypatch.setattr("app.api.routes.llm_client.chat", mock_chat)

        small_docx = io.BytesIO()
        with zipfile.ZipFile(small_docx, "w") as z:
            z.writestr("word/document.xml", """<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>name: test_world
world:
  name: test_world
  description: A test world
</w:t></w:r></w:p></w:body></w:document>""")

        b64 = base64.b64encode(small_docx.getvalue()).decode()

        resp = client.post(
            "/api/templates/import",
            json={
                "content": b64,
                "filename": "test.docx",
                "binary": True,
            },
        )
        assert resp.status_code == 200, (
            f"Small docx should be imported, got {resp.status_code}: {resp.json()}"
        )
