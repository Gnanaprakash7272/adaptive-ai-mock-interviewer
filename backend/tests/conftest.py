# tests/conftest.py — project-wide pytest configuration
# This file's presence anchors the pytest rootdir to this directory.
# Required on Windows with restricted drives (e.g. F:\) to prevent
# pytest 9.x from trying to stat the drive root and failing with PermissionError.

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Project root on sys.path — must happen before ANY local package import.
# _root is the directory containing api/, tests/, etc.
# ---------------------------------------------------------------------------
_backend = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_root = os.path.dirname(_backend)
_intelligence = os.path.join(_backend, "intelligence")
for _p in (_intelligence, _backend, _root):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ---------------------------------------------------------------------------
# Load environment variables.
# On developer machines, read .env if present without overriding explicit env.
# In CI (GitHub Actions), environment variables are already set by the runner.
# ---------------------------------------------------------------------------
from dotenv import load_dotenv

_env_file = Path(_backend) / ".env"
if not _env_file.is_file():
    _env_file = Path(_root) / ".env"
if _env_file.is_file():
    load_dotenv(dotenv_path=_env_file, override=False)

# Safe fallbacks for CI and environments lacking a .env file:
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "mock-supabase-key-for-test-suite")
os.environ.setdefault("JWT_SECRET_KEY", "ci-only-secret-ci-only-secret-ci-only-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("GEMINI_API_KEY", "mock-gemini-key")

# ---------------------------------------------------------------------------
# Block external network calls to Supabase and SMTP across all tests.
# ---------------------------------------------------------------------------
_mock_supabase = MagicMock()


def _make_table_mock(name=""):
    table_mock = MagicMock()

    select_mock = MagicMock()
    select_mock.eq.return_value = select_mock
    select_mock.is_.return_value = select_mock
    select_mock.order.return_value = select_mock
    select_mock.limit.return_value = select_mock
    select_mock.execute.return_value = MagicMock(
        data=[{"user_id": 1, "token_version": 0, "email": "test@example.com"}]
    )
    table_mock.select.return_value = select_mock

    insert_mock = MagicMock()
    insert_mock.execute.return_value = MagicMock(
        data=[{"user_id": 1, "token_version": 0, "email": "test@example.com"}]
    )
    table_mock.insert.return_value = insert_mock

    update_mock = MagicMock()
    update_mock.eq.return_value = update_mock
    update_mock.is_.return_value = update_mock
    update_mock.select.return_value = update_mock
    update_mock.execute.return_value = MagicMock(
        data=[{"user_id": 1, "token_version": 0, "email": "test@example.com"}]
    )
    table_mock.update.return_value = update_mock
    return table_mock


_mock_supabase.table.side_effect = _make_table_mock

_create_client_patch = patch("supabase.create_client", return_value=_mock_supabase)
_create_client_patch.start()

_smtp_patch = patch("smtplib.SMTP", MagicMock())
_smtp_patch.start()

import types as _types

_fake_db = _types.ModuleType("api.db")
_fake_db.supabase = _mock_supabase
_fake_db.SUPABASE_URL = os.environ["SUPABASE_URL"]
_fake_db.SUPABASE_KEY = os.environ["SUPABASE_KEY"]
sys.modules.setdefault("api.db", _fake_db)

# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------
import pytest


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """
    Reset the SlowAPI in-memory rate-limit storage before every test.

    Without this, requests from one test accumulate in the same bucket as
    the next test (all TestClient requests share IP 127.0.0.1), causing
    tests that run after a rate-limiting test to receive spurious 429 responses.
    """
    try:
        from api.auth import limiter

        storage = limiter._storage
        if hasattr(storage, "reset"):
            storage.reset()
        elif hasattr(storage, "storage"):
            storage.storage.clear()
    except Exception:
        pass
    yield
