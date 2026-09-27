import os
import re
import hmac
import hashlib
import secrets
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME or "noreply@aimockora.com")

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
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def hash_otp(otp: str) -> str:
    """Hash the OTP using SHA256 for secure storage."""
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()

def send_otp_email(email: str, otp: str):
    """
    Sends the OTP via email using SMTP.
    If no SMTP credentials are provided in .env, falls back to printing to the console.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"--- MOCK EMAIL TO: {email} ---")
        print(f"AI MOCKORA\n\nYour password reset verification code is:\n\n{otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.")
        print("--------------------------------")
        print("WARNING: Email not sent! Configure SMTP_USERNAME and SMTP_PASSWORD in .env")
        return

    msg = MIMEMultipart()
    msg['From'] = f"AI MOCKORA <{FROM_EMAIL}>"
    msg['To'] = email
    msg['Subject'] = "Your AI MOCKORA Password Reset Code"

    body = f"Your password reset verification code is:\n\n{otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request a password reset, you can safely ignore this email."
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"OTP Email successfully sent to {email}")
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")
        # Fallback so user can still test
        print(f"--- FALLBACK MOCK EMAIL TO: {email} ---")
        print(body)
        print("--------------------------------")


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    """
    Initiate password reset flow:
    - Generates 6-digit OTP
    - Hashes OTP and stores in DB
    - Sends email with OTP
    """
    email = request.email
    
    try:
        result = supabase.table("users").select("user_id").eq("email", email).execute()
        
        if result.data and len(result.data) > 0:
            user_id = result.data[0]["user_id"]
            
            # Rate limiting / Attempt check could go here
            
            otp = generate_otp()
            otp_hash = hash_otp(otp)
            expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
            
            supabase.table("password_reset_otps").insert({
                "user_id": user_id,
                "otp_hash": otp_hash,
                "expires_at": expires_at
            }).execute()
            
            send_otp_email(email, otp)
            
    except Exception as e:
        print(f"Error in forgot_password: {e}")
        # Continue to return generic response
        
    return {"message": "If an account exists, a verification code has been sent."}

@router.post("/verify-reset-otp")
def verify_reset_otp(request: VerifyOTPRequest):
    """
    Verify the 6-digit OTP:
    - Checks expiry and attempts
    - Matches hashed OTP
    - Issues a short-lived reset token
    """
    email = request.email.strip().lower()
    otp = request.otp.strip()
    
    invalid_otp_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired OTP",
    )
    
    try:
        user_result = supabase.table("users").select("user_id").eq("email", email).execute()
        if not user_result.data:
            raise invalid_otp_exception
            
        user_id = user_result.data[0]["user_id"]
        
        # Get the latest active OTP for this user
        otp_result = supabase.table("password_reset_otps")\
            .select("*")\
            .eq("user_id", user_id)\
            .is_("verified_at", "null")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
            
        if not otp_result.data:
            raise invalid_otp_exception
            
        otp_record = otp_result.data[0]
        
        if otp_record["attempts"] >= 5:
            raise HTTPException(status_code=400, detail="Too many attempts. Request a new OTP.")
            
        # Check expiry
        expires_at = datetime.fromisoformat(otp_record["expires_at"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            raise invalid_otp_exception
            
        # Verify OTP
        if hash_otp(otp) != otp_record["otp_hash"]:
            supabase.table("password_reset_otps").update({
                "attempts": otp_record["attempts"] + 1
            }).eq("id", otp_record["id"]).execute()
            raise invalid_otp_exception
            
        # Mark as verified
        supabase.table("password_reset_otps").update({
            "verified_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", otp_record["id"]).execute()
        
        # Create a short-lived reset token (valid for 15 mins)
        token_payload = {
            "sub": str(user_id),
            "purpose": "password_reset",
        }
        reset_token = create_access_token(token_payload, expires_delta=timedelta(minutes=15))
        
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
    """
    email = request.email.strip().lower()
    
    try:
        # Validate token
        payload = jwt.decode(request.reset_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != "password_reset":
            raise ValueError()
            
        token_user_id = int(payload.get("sub"))
        
        # Verify the user matches the token
        user_result = supabase.table("users").select("user_id").eq("email", email).execute()
        if not user_result.data or user_result.data[0]["user_id"] != token_user_id:
            raise ValueError()
            
        # Hash new password and update
        hashed_password = hash_password(request.new_password)
        supabase.table("users").update({"password_hash": hashed_password}).eq("user_id", token_user_id).execute()
        
        # Optionally invalidate the OTP completely or use token blacklisting
        # For now, password changed successfully.
        
        return {"message": "Password reset successfully"}
        
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    except Exception as e:
        print(f"Error in reset_password: {e}")
        raise HTTPException(status_code=500, detail="Could not reset password")
