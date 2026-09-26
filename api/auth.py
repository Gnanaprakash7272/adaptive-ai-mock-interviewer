import os
import re
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator

from api.db import supabase

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

# Password hashing constants
PBKDF2_ITERATIONS = 260_000
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

security = HTTPBearer(auto_error=False)


# ============================================================================
# Password Hashing & Verification
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with cryptographically random salt."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${pwd_hash.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored PBKDF2 hash using constant-time comparison."""
    if not hashed_password or not plain_password:
        return False
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

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
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


class SignupResponse(BaseModel):
    user_id: int
    email: str
    message: str = "Account created successfully"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest):
    """
    Register a new user account:
    - Validates email and password format
    - Checks for duplicate email in Supabase users table
    - Hashes password with PBKDF2-HMAC-SHA256
    - Inserts user record and returns safe user information
    """
    email = request.email

    try:
        # Check if email is already registered
        existing = (
            supabase.table("users")
            .select("user_id")
            .eq("email", email)
            .execute()
        )
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered",
            )

        # Hash password securely
        hashed = hash_password(request.password)

        # Insert new user into Supabase users table
        insert_result = (
            supabase.table("users")
            .insert({"email": email, "password_hash": hashed})
            .execute()
        )

        if not insert_result.data or len(insert_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account",
            )

        new_user = insert_result.data[0]
        return SignupResponse(
            user_id=new_user["user_id"],
            email=new_user["email"],
            message="Account created successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during registration: {str(e)}",
        )


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """
    Authenticate user and issue JWT:
    - Finds user by email in Supabase users table
    - Verifies password hash using constant-time comparison
    - Issues signed JWT token
    - Returns token and safe user profile (never exposes password_hash)
    """
    email = request.email

    try:
        # Query user record by email
        result = (
            supabase.table("users")
            .select("user_id, email, password_hash")
            .eq("email", email)
            .execute()
        )

        # Constant message for both nonexistent user and wrong password to prevent user enumeration
        invalid_credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

        if not result.data or len(result.data) == 0:
            raise invalid_credentials_exception

        user_record = result.data[0]
        stored_hash = user_record.get("password_hash", "")

        # Verify password
        if not verify_password(request.password, stored_hash):
            raise invalid_credentials_exception

        user_id = user_record["user_id"]
        user_email = user_record["email"]

        # Issue JWT access token
        token_payload = {
            "sub": str(user_id),
            "user_id": user_id,
            "email": user_email,
        }
        access_token = create_access_token(token_payload)

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserInfo(user_id=user_id, email=user_email),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during authentication: {str(e)}",
        )


# ============================================================================
# Dependency for Protected Endpoints (Foundation for future features)
# ============================================================================

def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserInfo:
    """Dependency to extract and validate the authenticated user from the Bearer token."""
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth_credentials.credentials)
    user_id = payload.get("user_id")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserInfo(user_id=user_id, email=email)
