"""
api/errors.py

Standardized error foundation and domain exceptions for the AI MOCKORA backend.

Provides consistent API error responses conforming to:
{
    "success": false,
    "error": {
        "code": "<ERROR_CODE>",
        "message": "<Human-readable safe message>"
    }
}
"""

from typing import Any, Dict, Optional
from fastapi.responses import JSONResponse


# =============================================================================
# CONSTANTS
# =============================================================================

MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10 MB limit


# Standard Error Code Constants
CODE_EMPTY_FILE = "EMPTY_FILE"
CODE_INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
CODE_INVALID_PDF = "INVALID_PDF"
CODE_FILE_TOO_LARGE = "FILE_TOO_LARGE"
CODE_EMPTY_RESUME = "EMPTY_RESUME"
CODE_RESUME_CLEANING_FAILED = "RESUME_CLEANING_FAILED"
CODE_AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE"
CODE_AI_SERVICE_TIMEOUT = "AI_SERVICE_TIMEOUT"
CODE_RESUME_ANALYSIS_FAILED = "RESUME_ANALYSIS_FAILED"
CODE_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
CODE_VALIDATION_ERROR = "VALIDATION_ERROR"
CODE_UNAUTHORIZED = "UNAUTHORIZED"
CODE_FORBIDDEN = "FORBIDDEN"
CODE_NOT_FOUND = "NOT_FOUND"


# =============================================================================
# PAYLOAD BUILDERS
# =============================================================================

def make_error_payload(code: str, message: str) -> Dict[str, Any]:
    """
    Construct standard error dictionary.
    Includes 'detail' as backward-compatibility alias for clients/tests.
    """
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
        "detail": message,
    }


def make_error_response(
    status_code: int,
    code: str,
    message: str,
    headers: Optional[Dict[str, str]] = None,
) -> JSONResponse:
    """Helper to build a FastAPI JSONResponse for standard errors."""
    return JSONResponse(
        status_code=status_code,
        headers=headers,
        content=make_error_payload(code, message),
    )


# =============================================================================
# BASE & DOMAIN API ERRORS
# =============================================================================

class APIError(Exception):
    """
    Base exception for expected API error conditions.
    Caught by FastAPI exception handler and formatted into standard response.
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers
        super().__init__(message)


class EmptyFileError(APIError):
    def __init__(self, message: str = "Uploaded file is empty."):
        super().__init__(status_code=400, code=CODE_EMPTY_FILE, message=message)


class InvalidFileTypeError(APIError):
    def __init__(self, message: str = "Only PDF files are supported."):
        super().__init__(status_code=400, code=CODE_INVALID_FILE_TYPE, message=message)


class InvalidPDFError(APIError):
    def __init__(
        self,
        message: str = "File does not appear to be a valid PDF document.",
        status_code: int = 400,
    ):
        super().__init__(status_code=status_code, code=CODE_INVALID_PDF, message=message)


class FileTooLargeError(APIError):
    def __init__(self, message: str = "File size exceeds the 10 MB limit."):
        super().__init__(status_code=413, code=CODE_FILE_TOO_LARGE, message=message)


class EmptyResumeError(APIError):
    def __init__(
        self,
        message: str = "No readable text could be extracted from this resume.",
    ):
        super().__init__(status_code=422, code=CODE_EMPTY_RESUME, message=message)


class ResumeCleaningFailedError(APIError):
    def __init__(self, message: str = "Resume text could not be processed."):
        super().__init__(status_code=422, code=CODE_RESUME_CLEANING_FAILED, message=message)


class AIServiceUnavailableError(APIError):
    def __init__(
        self,
        message: str = "The AI service is temporarily unavailable. Please try again.",
    ):
        super().__init__(status_code=503, code=CODE_AI_SERVICE_UNAVAILABLE, message=message)


class AIServiceTimeoutError(APIError):
    def __init__(self, message: str = "AI processing timed out. Please try again."):
        super().__init__(status_code=504, code=CODE_AI_SERVICE_TIMEOUT, message=message)


class ResumeAnalysisFailedError(APIError):
    def __init__(
        self,
        message: str = "Your resume could not be analysed. Please try again.",
        status_code: int = 502,
    ):
        super().__init__(status_code=status_code, code=CODE_RESUME_ANALYSIS_FAILED, message=message)


class InternalServerError(APIError):
    def __init__(
        self,
        message: str = "Something went wrong. Please try again.",
    ):
        super().__init__(status_code=500, code=CODE_INTERNAL_SERVER_ERROR, message=message)
