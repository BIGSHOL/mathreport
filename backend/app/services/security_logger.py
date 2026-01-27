"""Security logging service for tracking auth failures and API errors."""
import logging
from datetime import datetime
from typing import Optional
from fastapi import Request

from app.db.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


class SecurityLogger:
    """Service for logging security-related events to database."""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def log_auth_failure(
        self,
        request: Request,
        error_message: str,
        email: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        """Log authentication failure."""
        await self._save_log(
            log_type="auth_failure",
            severity="warning",
            request=request,
            email=email,
            error_message=error_message,
            details=details,
        )

    async def log_api_error(
        self,
        request: Request,
        error_message: str,
        user_id: Optional[str] = None,
        severity: str = "error",
        details: Optional[dict] = None,
    ) -> None:
        """Log API error."""
        await self._save_log(
            log_type="api_error",
            severity=severity,
            request=request,
            user_id=user_id,
            error_message=error_message,
            details=details,
        )

    async def log_security_alert(
        self,
        request: Request,
        error_message: str,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        severity: str = "critical",
        details: Optional[dict] = None,
    ) -> None:
        """Log security alert (e.g., repeated failures, suspicious activity)."""
        await self._save_log(
            log_type="security_alert",
            severity=severity,
            request=request,
            user_id=user_id,
            email=email,
            error_message=error_message,
            details=details,
        )

    async def _save_log(
        self,
        log_type: str,
        severity: str,
        request: Optional[Request] = None,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        error_message: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> None:
        """Save log entry to database."""
        try:
            # Extract request info
            ip_address = None
            user_agent = None
            endpoint = None
            method = None

            if request:
                # Get client IP (handle proxies)
                forwarded = request.headers.get("X-Forwarded-For")
                if forwarded:
                    ip_address = forwarded.split(",")[0].strip()
                else:
                    ip_address = request.client.host if request.client else None

                user_agent = request.headers.get("User-Agent")
                endpoint = str(request.url.path)
                method = request.method

            log_data = {
                "log_type": log_type,
                "severity": severity,
                "user_id": user_id,
                "email": email,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "endpoint": endpoint,
                "method": method,
                "error_message": error_message[:1000] if error_message else None,
                "details": details,
                "created_at": datetime.utcnow().isoformat(),
            }

            # Remove None values
            log_data = {k: v for k, v in log_data.items() if v is not None}

            await self.db.table("security_logs").insert(log_data).execute()

        except Exception as e:
            # Don't let logging failures break the app
            logger.error(f"Failed to save security log: {e}")


# Singleton-like function for easy access
_security_logger: Optional[SecurityLogger] = None


def get_security_logger(db: SupabaseClient) -> SecurityLogger:
    """Get or create security logger instance."""
    global _security_logger
    if _security_logger is None:
        _security_logger = SecurityLogger(db)
    return _security_logger
