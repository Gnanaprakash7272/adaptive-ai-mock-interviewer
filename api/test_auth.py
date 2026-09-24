from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from api.main import app
from api.auth import hash_password, verify_password, decode_access_token

client = TestClient(app)


# ============================================================================
# Helpers & Mocks
# ============================================================================

def make_supabase_mock(select_data=None, insert_data=None):
    """Create a mock Supabase client mimicking postgrest query builder chains."""
    mock_client = MagicMock()

    # Query builder mock
    query_builder = MagicMock()

    # select chaining
    select_builder = MagicMock()
    select_builder.eq.return_value = select_builder
    select_builder.execute.return_value = MagicMock(data=select_data or [])
    query_builder.select.return_value = select_builder

    # insert chaining
    insert_builder = MagicMock()
    insert_builder.execute.return_value = MagicMock(data=insert_data or [])
    query_builder.insert.return_value = insert_builder

    mock_client.table.return_value = query_builder
    return mock_client, query_builder


# ============================================================================
# Test Cases
# ============================================================================

def test_1_successful_signup():
    """Verify successful user signup with status 201 and safe response."""
    test_email = "newuser@example.com"
    test_password = "SecurePassword123!"

    mock_supabase, _ = make_supabase_mock(
        select_data=[],  # No existing user
        insert_data=[{"user_id": 42, "email": test_email, "created_at": "2026-09-24T12:00:00Z"}]
    )

    with patch("api.auth.supabase", mock_supabase):
        response = client.post(
            "/auth/signup",
            json={"email": test_email, "password": test_password},
        )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["user_id"] == 42
    assert data["email"] == test_email
    assert data["message"] == "Account created successfully"
    assert "password_hash" not in data
    assert "password" not in data

    print("PASS  test_1_successful_signup")


def test_2_duplicate_email():
    """Verify signup rejection when email already exists (HTTP 400)."""
    existing_email = "existing@example.com"

    mock_supabase, _ = make_supabase_mock(
        select_data=[{"user_id": 10, "email": existing_email}]  # Email already exists
    )

    with patch("api.auth.supabase", mock_supabase):
        response = client.post(
            "/auth/signup",
            json={"email": existing_email, "password": "SecurePassword123!"},
        )

    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    assert "already registered" in response.json()["detail"].lower()

    print("PASS  test_2_duplicate_email")


def test_3_invalid_signup_input():
    """Verify validation errors for bad email, short password, or blank password (HTTP 422)."""
    # Invalid email format
    res_bad_email = client.post(
        "/auth/signup",
        json={"email": "not-an-email", "password": "ValidPassword123!"},
    )
    assert res_bad_email.status_code == 422, f"Expected 422 for bad email, got {res_bad_email.status_code}"

    # Too short password (< 8 chars)
    res_short_pwd = client.post(
        "/auth/signup",
        json={"email": "valid@example.com", "password": "short"},
    )
    assert res_short_pwd.status_code == 422, f"Expected 422 for short password, got {res_short_pwd.status_code}"

    # Blank password
    res_blank_pwd = client.post(
        "/auth/signup",
        json={"email": "valid@example.com", "password": "        "},
    )
    assert res_blank_pwd.status_code == 422, f"Expected 422 for blank password, got {res_blank_pwd.status_code}"

    print("PASS  test_3_invalid_signup_input")


def test_4_successful_login():
    """Verify successful login returns HTTP 200, JWT token, and safe user profile."""
    test_email = "user@example.com"
    raw_password = "CorrectPassword123!"
    hashed = hash_password(raw_password)

    mock_supabase, _ = make_supabase_mock(
        select_data=[{"user_id": 99, "email": test_email, "password_hash": hashed}]
    )

    with patch("api.auth.supabase", mock_supabase):
        response = client.post(
            "/auth/login",
            json={"email": test_email, "password": raw_password},
        )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["user_id"] == 99
    assert data["user"]["email"] == test_email
    assert "password_hash" not in data
    assert "password_hash" not in data["user"]

    print("PASS  test_4_successful_login")


def test_5_wrong_password():
    """Verify login failure with incorrect password returns HTTP 401."""
    test_email = "user@example.com"
    hashed = hash_password("CorrectPassword123!")

    mock_supabase, _ = make_supabase_mock(
        select_data=[{"user_id": 99, "email": test_email, "password_hash": hashed}]
    )

    with patch("api.auth.supabase", mock_supabase):
        response = client.post(
            "/auth/login",
            json={"email": test_email, "password": "WrongPassword999!"},
        )

    assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    assert response.json()["detail"] == "Invalid email or password"

    print("PASS  test_5_wrong_password")


def test_6_nonexistent_user():
    """Verify login failure for unregistered email returns HTTP 401 with identical error message."""
    mock_supabase, _ = make_supabase_mock(select_data=[])  # No user found

    with patch("api.auth.supabase", mock_supabase):
        response = client.post(
            "/auth/login",
            json={"email": "ghost@example.com", "password": "AnyPassword123!"},
        )

    assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    # Error message must match wrong password exactly to prevent user enumeration
    assert response.json()["detail"] == "Invalid email or password"

    print("PASS  test_6_nonexistent_user")


def test_7_password_stored_as_hash_not_plaintext():
    """Verify that passwords are securely hashed using PBKDF2-HMAC-SHA256 and never stored in plaintext."""
    raw_pwd = "MySecretPlaintextPassword123!"
    hashed = hash_password(raw_pwd)

    # 1. Direct hashing assertions
    assert hashed != raw_pwd
    assert raw_pwd not in hashed
    assert hashed.startswith("pbkdf2_sha256$260000$")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

    # 2. Verify signup inserts hashed password into database, never plaintext
    mock_supabase, query_builder = make_supabase_mock(
        select_data=[],
        insert_data=[{"user_id": 1, "email": "hashcheck@example.com"}]
    )

    with patch("api.auth.supabase", mock_supabase):
        client.post(
            "/auth/signup",
            json={"email": "hashcheck@example.com", "password": raw_pwd},
        )

    # Inspect the exact dictionary passed to supabase.table('users').insert(...)
    insert_call_args = query_builder.insert.call_args[0][0]
    inserted_password_hash = insert_call_args["password_hash"]

    assert inserted_password_hash != raw_pwd, "Security Alert: Plaintext password was passed to insert!"
    assert inserted_password_hash.startswith("pbkdf2_sha256$260000$")
    assert verify_password(raw_pwd, inserted_password_hash) is True

    print("PASS  test_7_password_stored_as_hash_not_plaintext")


def test_8_login_returns_token():
    """Verify that login returns a valid, decodable JWT access token with correct claims."""
    test_email = "tokenuser@example.com"
    raw_pwd = "TokenTestPassword123!"
    hashed = hash_password(raw_pwd)

    mock_supabase, _ = make_supabase_mock(
        select_data=[{"user_id": 105, "email": test_email, "password_hash": hashed}]
    )

    with patch("api.auth.supabase", mock_supabase):
        response = client.post(
            "/auth/login",
            json={"email": test_email, "password": raw_pwd},
        )

    assert response.status_code == 200
    token = response.json()["access_token"]
    assert isinstance(token, str) and len(token) > 20

    # Decode and verify token claims
    payload = decode_access_token(token)
    assert payload["sub"] == "105"
    assert payload["user_id"] == 105
    assert payload["email"] == test_email
    assert "exp" in payload
    assert "iat" in payload

    print("PASS  test_8_login_returns_token")


def test_9_response_never_exposes_password_hash():
    """Verify that neither signup nor login responses ever contain 'password_hash'."""
    raw_pwd = "CheckNoHashPass123!"
    hashed = hash_password(raw_pwd)

    # Check Signup
    mock_supabase_signup, _ = make_supabase_mock(
        select_data=[],
        insert_data=[{"user_id": 200, "email": "nohash@example.com", "password_hash": hashed}]
    )
    with patch("api.auth.supabase", mock_supabase_signup):
        signup_res = client.post(
            "/auth/signup",
            json={"email": "nohash@example.com", "password": raw_pwd},
        )

    assert signup_res.status_code == 201
    signup_json_str = signup_res.text
    assert "password_hash" not in signup_json_str
    assert hashed not in signup_json_str

    # Check Login
    mock_supabase_login, _ = make_supabase_mock(
        select_data=[{"user_id": 200, "email": "nohash@example.com", "password_hash": hashed}]
    )
    with patch("api.auth.supabase", mock_supabase_login):
        login_res = client.post(
            "/auth/login",
            json={"email": "nohash@example.com", "password": raw_pwd},
        )

    assert login_res.status_code == 200
    login_json_str = login_res.text
    assert "password_hash" not in login_json_str
    assert hashed not in login_json_str

    print("PASS  test_9_response_never_exposes_password_hash")


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == "__main__":
    print("\nRunning Authentication & User Persistence Tests...\n")
    test_1_successful_signup()
    test_2_duplicate_email()
    test_3_invalid_signup_input()
    test_4_successful_login()
    test_5_wrong_password()
    test_6_nonexistent_user()
    test_7_password_stored_as_hash_not_plaintext()
    test_8_login_returns_token()
    test_9_response_never_exposes_password_hash()
    print("\nAll 9/9 Authentication tests passed successfully!\n")
