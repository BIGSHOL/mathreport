"""FastAPI application with authentication."""
import logging
import traceback
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1 import auth, exam, users, analysis, subscription, ai_learning, pattern, reference, admin, trends
from app.core.config import settings
from app.db.supabase_client import get_supabase
from app.services.security_logger import get_security_logger

# 과다한 로그 레벨 조정
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# CORS origins - 환경변수에서 로드
CORS_ORIGINS = settings.cors_origins_list
print(f"[CORS] Allowed origins: {CORS_ORIGINS}")


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to catch all errors and add CORS headers."""

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            print(f"[ERROR] {request.method} {request.url.path}: {exc}")
            traceback.print_exc()

            response = JSONResponse(
                status_code=500,
                content={"detail": str(exc)},
            )

            if origin in CORS_ORIGINS:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"

            return response


app = FastAPI(title="API", version="0.1.0")

# Add error handling middleware FIRST (outermost)
app.add_middleware(ErrorHandlingMiddleware)

# Then add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException with CORS headers."""
    origin = request.headers.get("origin", "")

    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with CORS headers."""
    print(f"[ERROR] {request.method} {request.url.path}: {exc}")
    traceback.print_exc()

    # Log API error to security_logs
    try:
        db = get_supabase()
        security_logger = get_security_logger(db)
        await security_logger.log_api_error(
            request=request,
            error_message=str(exc),
            severity="error",
            details={"traceback": traceback.format_exc()[:2000]},
        )
    except Exception as log_err:
        print(f"[SecurityLog] Failed to log error: {log_err}")

    origin = request.headers.get("origin", "")

    response = JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

    if origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"

    return response

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(exam.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(subscription.router, prefix="/api/v1/subscription")
app.include_router(ai_learning.router, prefix="/api/v1")
app.include_router(pattern.router, prefix="/api/v1")
app.include_router(reference.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(trends.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
