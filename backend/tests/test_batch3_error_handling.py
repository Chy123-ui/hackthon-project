"""Batch 3 错误处理测试: bare except -> specific + config save fail + decrypt warning"""
import json
import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestConfigSaveFailure:
    """3.2: 配置保存失败应返回 500"""

    def test_config_save_failure_returns_error(self, client, monkeypatch):
        monkeypatch.setattr(
            "app.api.routes._save_server_config",
            lambda config: False,
        )

        resp = client.put("/api/config", json={"api_key": "sk-test-key"})
        assert resp.status_code == 500, (
            f"Config save failure should return 500, got {resp.status_code}"
        )
        detail = resp.json().get("detail", "")
        assert "Failed to save" in detail, (
            f"Expected 'Failed to save' in error, got: {detail}"
        )


class TestDecryptFailureWarning:
    """3.3: 解密失败应记录警告"""

    def test_decrypt_failure_logs_warning(self, caplog):
        from app.core.encrypt_config import decrypt_config

        config = {
            "api_key": "invalid_encrypted_data",
            "_encrypted": True,
        }

        with patch("app.core.encrypt_config._get_fernet") as mock_f:
            mock_fernet = MagicMock()
            mock_fernet.decrypt.side_effect = ValueError("Invalid token")
            mock_f.return_value = mock_fernet

            with caplog.at_level("WARNING"):
                result = decrypt_config(config)

            assert result["api_key"] == "", (
                f"Failed decrypt should clear api_key, got: {result['api_key']}"
            )
            assert "_encrypted" not in result

            assert any(
                "Failed to decrypt API key" in record.message
                for record in caplog.records
            ), f"No warning logged for decrypt failure. Logs: {caplog.text}"


class TestSpecificExceptionCatching:
    """3.1: bare except 已替换为具体异常"""

    def test_load_config_io_error_not_crashing(self):
        from app.api.routes import _load_server_config
        with patch("builtins.open", side_effect=OSError("Permission denied")):
            result = _load_server_config()
            assert result == {}, (
                f"Config load should return empty dict on IO error, got: {result}"
            )

    def test_load_config_json_error_not_crashing(self, tmp_path):
        from app.api.routes import _load_server_config
        bad_file = tmp_path / "config.json"
        bad_file.write_text("not valid json{{{", encoding="utf-8")

        with patch("app.api.routes.CONFIG_PATH", bad_file):
            result = _load_server_config()
            assert result == {}, (
                f"Config load should return empty dict on JSON error, got: {result}"
            )

    def test_load_yaml_not_crashing_on_bad_file(self):
        from app.core.prompt_engine import PromptEngine
        engine = PromptEngine()
        result = engine._load_yaml(engine.protocol_dir / "nonexistent.yaml")
        assert result == {}, (
            f"Load yaml should return empty dict on missing file, got: {result}"
        )

    def test_sessions_list_not_crashing_on_corrupt(self, tmp_path, monkeypatch):
        from app.core.session import SessionManager
        mgr = SessionManager()
        monkeypatch.setattr(mgr, "sessions_dir", tmp_path)

        corrupt = tmp_path / "bad.json.gz"
        corrupt.write_bytes(b"this is not a valid gzip file")

        sessions = mgr.list_sessions()
        assert isinstance(sessions, list), (
            f"Sessions list should return list on corrupt file, got: {type(sessions)}"
        )

    def test_model_info_returns_default_on_failure(self):
        from app.core.model_info import fetch_model_max_tokens
        import asyncio
        import httpx

        async def run():
            with patch("httpx.AsyncClient") as mock_client:
                mock_client.return_value.__aenter__.return_value.get.side_effect = (
                    httpx.ConnectError("Connection refused")
                )
                return await fetch_model_max_tokens()

        result = asyncio.run(run())
        assert result == 131072, (
            f"Model info should return default 131072 on error, got: {result}"
        )

    def test_suggestions_return_empty_on_llm_error(self, client, monkeypatch):
        async def mock_chat(*args, **kwargs):
            raise OSError("Connection lost")
        monkeypatch.setattr("app.api.routes.llm_client.chat", mock_chat)

        resp = client.get("/api/templates/fantasy/modify-suggestions")
        assert resp.status_code == 200, (
            f"Suggestions should return 200 on error, got {resp.status_code}"
        )
        assert resp.json()["suggestions"] == [], (
            f"Suggestions should be empty list on error, got: {resp.json()}"
        )
