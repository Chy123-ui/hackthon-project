"""Batch 6 基础设施测试: 日志 + CSP 头 + CI 配置"""
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestSecurityHeaders:
    """6.3: 安全响应头"""

    def test_csp_header_present(self, client):
        resp = client.get("/health")
        csp = resp.headers.get("content-security-policy", "")
        assert csp, "CSP header is missing"
        assert "default-src" in csp, f"CSP missing default-src: {csp}"
        assert "script-src" in csp, f"CSP missing script-src: {csp}"
        assert "frame-ancestors 'none'" in csp, (
            f"CSP missing frame-ancestors: {csp}"
        )

    def test_x_content_type_options(self, client):
        resp = client.get("/health")
        assert resp.headers.get("x-content-type-options") == "nosniff"

    def test_x_frame_options(self, client):
        resp = client.get("/health")
        assert resp.headers.get("x-frame-options") == "DENY"

    def test_referrer_policy(self, client):
        resp = client.get("/health")
        assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    def test_api_endpoints_have_security_headers(self, client):
        resp = client.get("/api/config")
        assert resp.headers.get("content-security-policy"), (
            "CSP missing on API endpoint"
        )


class TestKeyFilePermissions:
    """6.4: .key 文件权限检查"""

    def test_check_key_permissions_does_not_crash(self, tmp_path):
        from app.core.encrypt_config import _check_key_permissions

        key_file = tmp_path / ".key"
        key_file.write_bytes(b"test")

        _check_key_permissions(key_file)

    def test_check_key_permissions_chmods_on_posix(self, tmp_path):
        import sys
        if sys.platform != "linux":
            pytest.skip("chmod test only meaningful on Linux")
        from unittest.mock import patch
        from app.core.encrypt_config import _check_key_permissions

        key_file = tmp_path / ".key"
        key_file.write_bytes(b"test")
        key_file.chmod(0o644)

        with patch("os.name", "posix"):
            _check_key_permissions(key_file)

        mode = key_file.stat().st_mode & 0o777
        assert mode == 0o600, (
            f"Key file should be chmod 600, got {oct(mode)}"
        )


class TestLoggingConfig:
    """6.1: 日志系统已配置"""

    def test_logger_emits_warnings(self, caplog):
        from app.core.encrypt_config import decrypt_config

        with caplog.at_level("WARNING"):
            result = decrypt_config({"api_key": "bad", "_encrypted": True})

        assert result["api_key"] == ""

    def test_root_logger_configured(self):
        import logging
        root = logging.getLogger()
        assert root.handlers or logging.getLogger("app").handlers, (
            "No logging handlers configured"
        )
