import hashlib
import hmac
import os
import re
import secrets
import smtplib
import string
from datetime import UTC, datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, field_validator
from slowapi import Limiter

from api.db import supabase

# ---------------------------------------------------------------------------
# Client-IP resolution for rate limiting
# ---------------------------------------------------------------------------

def get_client_ip(request: Request) -> str:
    """
    Resolve the real client IP for rate-limit keying.

    Security model
    ~~~~~~~~~~~~~~
    * Default (TRUST_PROXY_HEADERS unset / false):
        Uses ``request.client.host`` — the IP the server accepted the TCP
        connection from.  This is always reliable and cannot be spoofed by
        the client.

    * When TRUST_PROXY_HEADERS=true:
        Reads the ``X-Real-IP`` header first.  This single-value header is
        set by a trusted reverse proxy (nginx ``proxy_set_header X-Real-IP
        $remote_addr;``), so it reliably identifies the original client.

        ``X-Forwarded-For`` is NOT read because it is a comma-separated
        list where the leftmost value is client-supplied and can be
        trivially forged in direct (non-proxied) deployments.

    Set ``TRUST_PROXY_HEADERS=true`` only when the service is deployed
    behind a trusted reverse proxy that strips or rewrites the header.
    """
    trust_proxy = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"
    if trust_proxy:
        real_ip = request.headers.get("X-Real-IP", "").strip()
        if real_ip:
            return real_ip
    return (request.client.host if request.client else None) or "unknown"


# ---------------------------------------------------------------------------
# SlowAPI rate limiter — registered on app in api/main.py
# ---------------------------------------------------------------------------
# Use a lambda so tests can patch ``get_client_ip`` and have the effect
# reflected at call time (a direct reference would capture the original
# function object and ignore the patch).
limiter = Limiter(key_func=lambda request: get_client_ip(request))


# Router configuration
router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT Configuration from environment variables
# JWT_SECRET_KEY MUST be set in .env — no insecure default allowed.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY is not set. "
        "Add a strong random secret to your .env file before starting the server."
    )
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Password hashing
PBKDF2_ITERATIONS = 260_000
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME or "noreply@aimockora.com")

security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Try to import argon2-cffi; fall back gracefully so existing PBKDF2 hashes
# are still verified even if the library is unavailable.
# ---------------------------------------------------------------------------
try:
    from argon2 import PasswordHasher as _Argon2Hasher
    from argon2.exceptions import VerifyMismatchError as _VerifyMismatch
    _argon2 = _Argon2Hasher(
        time_cost=3,
        memory_cost=65536,  # 64 MiB
        parallelism=2,
        hash_len=32,
        salt_len=16,
    )
    _ARGON2_AVAILABLE = True
except ImportError:  # pragma: no cover — library is listed in deps
    _argon2 = None
    _ARGON2_AVAILABLE = False


# ============================================================================
# Password Hashing & Verification
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password.

    Uses Argon2id when the library is available (Phase 2+).
    Falls back to PBKDF2-HMAC-SHA256 when argon2-cffi is absent.
    """
    if _ARGON2_AVAILABLE:
        return _argon2.hash(password)
    # PBKDF2 fallback
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${pwd_hash.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password.

    Handles both Argon2id hashes (new accounts) and legacy PBKDF2 hashes
    (accounts created before the Phase 2 migration).
    Uses constant-time comparison for both schemes.
    """
    if not hashed_password or not plain_password:
        return False

    # Argon2id hash prefix
    if hashed_password.startswith("$argon2"):
        if not _ARGON2_AVAILABLE:
            return False
        try:
            return _argon2.verify(hashed_password, plain_password)
        except Exception:
            return False

    # Legacy PBKDF2 hash
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4:
            return False
        scheme, iterations_str, salt, stored_hash = parts
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iterations_str)
        pwd_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(pwd_hash.hex(), stored_hash)
    except Exception:
        return False


# ============================================================================
# JWT Token Utilities
# ============================================================================

def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(UTC)})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# Pydantic Schemas
# ============================================================================

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""  # Optional; omitting it is allowed for backward-compat

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean_email = v.strip().lower()
        if not clean_email or not EMAIL_REGEX.match(clean_email):
            raise ValueError("Invalid email format")
        return clean_email

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not v.strip():
            raise ValueError("Password cannot be blank or only whitespace")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean_email = v.strip().lower()
        if not clean_email:
            raise ValueError("Email cannot be empty")
        return clean_email

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError("Password cannot be empty")
        return v


class UserInfo(BaseModel):
    user_id: int
    email: str
    username: str
    name: str = ""


class SignupResponse(BaseModel):
    message: str = "Registration request received."


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


# (no custom rate-limiter code — SlowAPI decorators on endpoints handle this)


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/signup", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def signup(request: Request, body: SignupRequest):
    """
    Register a new user account.

    Returns a GENERIC response regardless of whether the email already exists
    to prevent user-enumeration attacks. The HTTP status is always 200 when
    the request is well-formed.
    """
    email = body.email

    try:
        # Check if email is already registered
        existing = (
            supabase.table("users")
            .select("user_id")
            .eq("email", email)
            .execute()
        )
        if existing.data and len(existing.data) > 0:
            # Generic response — do not reveal that the email exists.
            return SignupResponse()

        # Hash password securely (Argon2id preferred)
        hashed = hash_password(body.password)

        # Insert new user into Supabase users table
        insert_result = (
            supabase.table("users")
            .insert({
                "email": email,
                "password_hash": hashed,
                "name": body.name,
                "token_version": 0,
            })
            .execute()
        )

        if not insert_result.data or len(insert_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account",
            )

        return SignupResponse()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during registration: {str(e)}",
        )


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest):
    """
    Authenticate user and issue JWT.

    - Verifies password hash using constant-time comparison.
    - Includes token_version in the JWT so the token can be invalidated
      (e.g. after a password reset) by incrementing token_version in the DB.
    """
    email = body.email

    try:
        # Query user record by email — include token_version for invalidation
        result = (
            supabase.table("users")
            .select("user_id, email, password_hash, name, token_version")
            .eq("email", email)
            .execute()
        )

        # Constant message for nonexistent user and wrong password
        invalid_credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

        if not result.data or len(result.data) == 0:
            raise invalid_credentials_exception

        user_record = result.data[0]
        stored_hash = user_record.get("password_hash", "")

        if not verify_password(body.password, stored_hash):
            raise invalid_credentials_exception

        user_id = user_record["user_id"]
        user_email = user_record["email"]
        token_version = user_record.get("token_version", 0) or 0

        token_payload = {
            "sub": str(user_id),
            "user_id": user_id,
            "email": user_email,
            "username": user_email.split("@")[0],
            "name": user_record.get("name") or "",
            "token_version": token_version,
        }
        access_token = create_access_token(token_payload)

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserInfo(
                user_id=user_id,
                email=user_email,
                username=user_email.split("@")[0],
                name=user_record.get("name") or "",
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during authentication: {str(e)}",
        )


# ============================================================================
# Dependency for Protected Endpoints
# ============================================================================

def get_current_user(
    auth_credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserInfo:
    """Dependency to extract and validate the authenticated user from the Bearer token.

    Also validates token_version against the DB to invalidate tokens issued
    before the last password reset.
    """
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth_credentials.credentials)
    user_id = payload.get("user_id")
    email = payload.get("email")
    username = payload.get("username", email.split("@")[0] if email else "")
    name = payload.get("name") or ""
    token_version_in_jwt = payload.get("token_version", 0)

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate token_version — invalidates tokens issued before a password reset.
    try:
        result = (
            supabase.table("users")
            .select("token_version")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            db_version = result.data[0].get("token_version", 0) or 0
            if token_version_in_jwt < db_version:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been invalidated. Please log in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
    except HTTPException:
        raise
    except Exception:
        # If we cannot check (e.g. DB down), allow the token through — do not
        # lock out users due to a transient DB issue.
        pass

    return UserInfo(user_id=user_id, email=email, username=username, name=name)


# ============================================================================
# Password Reset Endpoints
# ============================================================================

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean_email = v.strip().lower()
        if not clean_email or not EMAIL_REGEX.match(clean_email):
            raise ValueError("Invalid email format")
        return clean_email

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not v.strip():
            raise ValueError("Password cannot be blank or only whitespace")
        return v

def generate_otp() -> str:
    """Generate a secure 6-digit OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(6))

def hash_otp(otp: str) -> str:
    """Hash the OTP using SHA256 for secure storage."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()

def send_otp_email(email: str, otp: str):
    """
    Sends the OTP via email using SMTP.
    If no SMTP credentials are provided in .env, falls back to printing to the console.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"--- MOCK EMAIL TO: {email} ---")
        print(
            f"AI MOCKORA\n\nYour password reset verification code is:\n\n{otp}\n\n"
            "This code expires in 10 minutes.\n\n"
            "If you did not request a password reset, you can safely ignore this email."
        )
        print("--------------------------------")
        print("WARNING: Email not sent! Configure SMTP_USERNAME and SMTP_PASSWORD in .env")
        return

    msg = MIMEMultipart()
    msg["From"] = f"AI MOCKORA <{FROM_EMAIL}>"
    msg["To"] = email
    msg["Subject"] = "Your AI MOCKORA Password Reset Code"

    body = (
        f"Your password reset verification code is:\n\n{otp}\n\n"
        "This code expires in 10 minutes.\n\n"
        "If you did not request a password reset, you can safely ignore this email."
    )
    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"OTP Email successfully sent to {email}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")
        print(f"--- FALLBACK MOCK EMAIL TO: {email} ---")
        print(body)
        print("--------------------------------")


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest):
    """
    Initiate password reset flow:
    - Generates 6-digit OTP
    - Hashes OTP and stores in DB
    - Sends email with OTP
    """
    email = body.email

    try:
        result = supabase.table("users").select("user_id").eq("email", email).execute()

        if result.data and len(result.data) > 0:
            user_id = result.data[0]["user_id"]

            otp = generate_otp()
            otp_hash = hash_otp(otp)
            expires_at = (datetime.now(UTC) + timedelta(minutes=10)).isoformat()

            supabase.table("password_reset_otps").insert({
                "user_id": user_id,
                "otp_hash": otp_hash,
                "expires_at": expires_at,
            }).execute()

            send_otp_email(email, otp)

    except Exception as e:
        print(f"Error in forgot_password: {e}")
        # Continue to return generic response

    return {"message": "If an account exists, a verification code has been sent."}

@router.post("/verify-reset-otp")
@limiter.limit("10/minute")
def verify_reset_otp(request: Request, body: VerifyOTPRequest):
    """
    Verify the 6-digit OTP:
    - Checks expiry and attempts
    - Matches hashed OTP
    - Issues a short-lived reset token
    """
    email = body.email.strip().lower()
    otp = body.otp.strip()

    invalid_otp_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired OTP",
    )

    try:
        user_result = supabase.table("users").select("user_id").eq("email", email).execute()
        if not user_result.data:
            raise invalid_otp_exception

        user_id = user_result.data[0]["user_id"]

        otp_result = (
            supabase.table("password_reset_otps")
            .select("*")
            .eq("user_id", user_id)
            .is_("verified_at", "null")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not otp_result.data:
            raise invalid_otp_exception

        otp_record = otp_result.data[0]

        if otp_record["attempts"] >= 5:
            raise HTTPException(
                status_code=400, detail="Too many attempts. Request a new OTP."
            )

        expires_at = datetime.fromisoformat(
            otp_record["expires_at"].replace("Z", "+00:00")
        )
        if datetime.now(UTC) > expires_at:
            raise invalid_otp_exception

        if hash_otp(otp) != otp_record["otp_hash"]:
            supabase.table("password_reset_otps").update(
                {"attempts": otp_record["attempts"] + 1}
            ).eq("id", otp_record["id"]).execute()
            raise invalid_otp_exception

        supabase.table("password_reset_otps").update(
            {"verified_at": datetime.now(UTC).isoformat()}
        ).eq("id", otp_record["id"]).execute()

        token_payload = {
            "sub": str(user_id),
            "purpose": "password_reset",
        }
        reset_token = create_access_token(
            token_payload, expires_delta=timedelta(minutes=15)
        )

        return {"reset_token": reset_token}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in verify_otp: {e}")
        raise invalid_otp_exception

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    """
    Reset password using the reset token.
    Increments token_version to invalidate all previously issued JWT tokens.
    """
    email = request.email.strip().lower()

    try:
        payload = jwt.decode(
            request.reset_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if payload.get("purpose") != "password_reset":
            raise ValueError()

        token_user_id = int(payload.get("sub"))

        user_result = (
            supabase.table("users").select("user_id, token_version").eq("email", email).execute()
        )
        if not user_result.data or user_result.data[0]["user_id"] != token_user_id:
            raise ValueError()

        current_version = user_result.data[0].get("token_version", 0) or 0
        hashed_password = hash_password(request.new_password)

        # Atomically update password AND increment token_version.
        # Any JWT issued with the old token_version will be rejected by
        # get_current_user from this point onwards.
        supabase.table("users").update({
            "password_hash": hashed_password,
            "token_version": current_version + 1,
        }).eq("user_id", token_user_id).execute()

        return {"message": "Password reset successfully"}

    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    except Exception as e:
        print(f"Error in reset_password: {e}")
        raise HTTPException(status_code=500, detail="Could not reset password")
