"""Pytest configuration - disable rate limiting for all tests except rate limit tests"""
import os
import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "enable_rate_limit: enable rate limiting for this test"
    )


@pytest.fixture(autouse=True)
def _disable_rate_limiting(request, monkeypatch):
    if "enable_rate_limit" not in request.node.keywords:
        monkeypatch.setenv("DISABLE_RATE_LIMIT", "1")
