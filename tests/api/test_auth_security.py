"""Security regression tests for the authentication API.

The xfail cases describe vulnerabilities identified during the authentication
review. They are intentionally kept in the suite so a later fix is visible as
an XPASS and cannot silently regress.
"""

from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from api.auth import (
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
    get_current_user,
)
from api.main import app

client = TestClient(app)


def _query_builder(*, user_data=None, update_error=None):
    builder = MagicMock()
    select_builder = MagicMock()
    select_builder.eq.return_value = select_builder
    select_builder.execute.return_value = MagicMock(data=user_data or [])
    builder.select.return_value = select_builder

    update_builder = MagicMock()
    update_builder.eq.return_value = update_builder
    if update_error is not None:
        update_builder.execute.side_effect = update_error
    else:
        update_builder.execute.return_value = MagicMock(data=[])
    builder.update.return_value = update_builder
    return builder


def _reset_supabase_mock(*, user_id=1, token_version=0):
    mock_client = MagicMock()

    def table(name):
        if name == "users":
            return _query_builder(
                user_data=[{"user_id": user_id, "token_version": token_version}]
            )
        return _query_builder()

    mock_client.table.side_effect = table
    return mock_client


def _reset_token(user_id=1):
    return jwt.encode(
        {"sub": str(user_id), "purpose": "password_reset"},
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


@pytest.mark.xfail(
    strict=False,
    reason="Reset tokens are currently not persisted or consumed after use.",
)
def test_reset_token_is_one_time_use():
    """A reset token must not be accepted a second time."""
    supabase = _reset_supabase_mock()
    payload = {
        "email": "user@example.com",
        "reset_token": _reset_token(),
        "new_password": "NewPassword123!",
    }

    with patch("api.auth.supabase", supabase):
        first = client.post("/auth/reset-password", json=payload)
        second = client.post("/auth/reset-password", json=payload)

    assert first.status_code == 200
    assert second.status_code == 400


def _credentials(user_id=1):
    token = jwt.encode(
        {
            "sub": str(user_id),
            "user_id": user_id,
            "email": "user@example.com",
            "username": "user",
            "token_version": 0,
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.mark.xfail(
    strict=False,
    reason="get_current_user currently fails open when the database is unavailable.",
)
def test_current_user_fails_closed_when_revocation_check_is_unavailable():
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = (
        RuntimeError("database unavailable")
    )

    with patch("api.auth.supabase", supabase):
        with pytest.raises(HTTPException) as error:
            get_current_user(_credentials())

    assert error.value.status_code in {401, 503}


@pytest.mark.xfail(
    strict=False,
    reason="get_current_user currently does not reject a deleted user record.",
)
def test_current_user_rejects_missing_user():
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )

    with patch("api.auth.supabase", supabase):
        with pytest.raises(HTTPException) as error:
            get_current_user(_credentials())

    assert error.value.status_code == 401


@pytest.mark.xfail(
    strict=False,
    reason="Signup currently includes raw database exception text in its response.",
)
def test_signup_does_not_expose_database_exception_details():
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = (
        RuntimeError("internal-postgres-connection-details")
    )

    with patch("api.auth.supabase", supabase):
        response = client.post(
            "/auth/signup",
            json={"email": "user@example.com", "password": "SecurePassword123!"},
        )

    assert response.status_code == 500
    assert "internal-postgres-connection-details" not in response.text
