"""Pytest configuration - disable rate limiting, isolate test data to tmp dir"""
import os
import shutil
import tempfile
from pathlib import Path
import pytest

_TMP_ROOT = Path(tempfile.mkdtemp(prefix="re-life-test-"))
os.environ["RE_LIFE_DATA_DIR"] = str(_TMP_ROOT / "data")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "enable_rate_limit: enable rate limiting for this test"
    )


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_TMP_ROOT, ignore_errors=True)


@pytest.fixture(autouse=True)
def _disable_rate_limiting(request, monkeypatch):
    if "enable_rate_limit" not in request.node.keywords:
        monkeypatch.setenv("DISABLE_RATE_LIMIT", "1")
