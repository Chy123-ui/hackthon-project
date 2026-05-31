"""Pytest configuration - disable rate limiting, auto-clean test data"""
import os
import shutil
from pathlib import Path
import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "enable_rate_limit: enable rate limiting for this test"
    )


@pytest.fixture(autouse=True)
def _disable_rate_limiting(request, monkeypatch):
    if "enable_rate_limit" not in request.node.keywords:
        monkeypatch.setenv("DISABLE_RATE_LIMIT", "1")


@pytest.fixture(autouse=True, scope="session")
def _clean_test_data():
    yield
    data = Path(__file__).parent.parent / "data"
    for sub in ("sessions", "worlds"):
        p = data / sub
        if p.exists():
            shutil.rmtree(p, ignore_errors=True)
    for f in (".key", "config.json"):
        p = data / f
        try:
            p.unlink(missing_ok=True)
        except Exception:
            pass
